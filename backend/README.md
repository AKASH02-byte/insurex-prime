# InsureX Prime — Backend API

Node.js + TypeScript API server for InsureX Prime. Lives alongside the existing
TanStack Start frontend (repository root) and is deployed separately.

| Concern        | Choice                                                         |
| -------------- | -------------------------------------------------------------- |
| HTTP           | Fastify 5                                                      |
| Validation     | Zod 4 via `fastify-type-provider-zod` (requests and responses) |
| Database       | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`)                   |
| Authentication | Firebase ID tokens verified with the Firebase Admin SDK        |
| Docs           | OpenAPI 3.1 + Swagger UI at `/docs`                            |
| Tests          | Vitest (unit + PostgreSQL integration)                         |

## Quick start

Requires Node.js 20.19+ and a PostgreSQL 14+ database.

```bash
cd backend
npm install
cp .env.example .env          # then fill in DATABASE_URL, FIREBASE_PROJECT_ID, …
npm run db:migrate            # create tables (prisma migrate dev)
npm run db:seed               # optional: fictional demo data
npm run dev                   # http://localhost:4000
```

- Health: `GET http://localhost:4000/api/v1/health`
- API docs: `http://localhost:4000/docs` (raw spec at `/docs/json`)

Any PostgreSQL works: a local install (`brew install postgresql@17`), Docker
(`docker run -e POSTGRES_PASSWORD=… -p 5432:5432 postgres:17`), or a hosted
database such as Neon, Supabase, Railway or RDS.

## Scripts

| Script                | What it does                                                      |
| --------------------- | ----------------------------------------------------------------- |
| `npm run dev`         | Watch mode with `tsx`, loads `.env`                               |
| `npm run build`       | Generates the Prisma client and compiles to `dist/`               |
| `npm run start`       | Runs `dist/server.js` (loads `.env` if present)                   |
| `npm run typecheck`   | `tsc --noEmit`                                                    |
| `npm run lint`        | ESLint                                                            |
| `npm run test`        | Vitest; DB integration tests need `TEST_DATABASE_URL` (see below) |
| `npm run db:generate` | Regenerates the Prisma client                                     |
| `npm run db:migrate`  | Creates/applies migrations in development                         |
| `npm run db:deploy`   | Applies committed migrations (production/CI)                      |
| `npm run db:seed`     | Seeds demo data (refuses to run when `NODE_ENV=production`)       |

## Environment variables

See [`.env.example`](.env.example). All are server-only — never expose them to the
frontend or prefix them with `VITE_`.

| Variable                                         | Required | Notes                                                                                                                       |
| ------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                   | yes      | `postgresql://…`                                                                                                            |
| `FIREBASE_PROJECT_ID`                            | yes      | Same Firebase project as the frontend (`VITE_FIREBASE_PROJECT_ID`)                                                          |
| `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | no       | Service account. Token verification works without it; with it, revoked tokens are rejected too. Literal `\n` is normalized. |
| `FRONTEND_URL`                                   | prod     | Comma-separated CORS origins, e.g. `http://localhost:8080,https://insurex-prime.vercel.app`. `*` is rejected in production. |
| `SUPER_ADMIN_EMAILS`                             | no       | Comma-separated Google emails provisioned as `SUPER_ADMIN` on first sign-in                                                 |
| `PORT`, `HOST`, `LOG_LEVEL`, `NODE_ENV`          | no       | Defaults: `4000`, `0.0.0.0`, `info`, `development`                                                                          |
| `TRUST_PROXY`                                    | no       | `true` behind a trusted load balancer so audit-log IPs are correct                                                          |
| `DOCS_ENABLED`                                   | no       | `false` hides `/docs`                                                                                                       |

Invalid configuration stops the server at startup with a list of the offending
variable **names** (values are never printed).

## Authentication and roles

```
Google sign-in (frontend) → Firebase → ID token
  → Authorization: Bearer <Firebase ID token>
  → Firebase Admin verifyIdToken → user + role looked up in PostgreSQL → authorized request
```

The role is **always** read from the database. Nothing in the request body,
query or token claims can grant a role or choose another agent's data.

How a verified Google identity becomes a user:

1. Known Firebase UID → that user.
2. Email matches a pre-provisioned user that has never signed in (e.g. an agent a
   Super Admin created with `POST /agents`) → the account is linked to this UID.
3. Email listed in `SUPER_ADMIN_EMAILS` → a `SUPER_ADMIN` user is created.
4. Anyone else → `403 ACCOUNT_NOT_PROVISIONED`. Accounts are never self-created.

Unverified emails, disabled users and non-`ACTIVE` agents are rejected (`403`).
The frontend should call `POST /api/v1/auth/verify` once after sign-in and
`GET /api/v1/auth/me` to read the server-side role.

### Permissions

| Capability                              | SUPER_ADMIN | AGENT                                  |
| --------------------------------------- | ----------- | -------------------------------------- |
| Agents: list / create / update / delete | ✅          | ❌ (can read only their own profile)   |
| Customers                               | all         | only their own; new ones auto-assigned |
| Policies (catalog)                      | full CRUD   | read ACTIVE only                       |
| Sold policies: list / read              | all         | their own                              |
| Sold policies: create                   | ✅          | own customers, catalog premium only    |
| Sold policies: update                   | ✅          | ❌                                     |
| Receipts: list / read / create          | all         | their own sales                        |
| Dashboard                               | platform    | their own figures                      |
| Reports, audit logs                     | ✅          | ❌                                     |

Records with history are protected: deleting an agent, customer or policy that
has sales returns `409` — deactivate it instead.

## API conventions

- Base path `/api/v1`. All endpoints except `/health` require a bearer token.
- Success: `{ "success": true, "data": … }` — lists add
  `"meta": { "page", "limit", "total", "totalPages" }`.
- Error: `{ "success": false, "error": { "code", "message", "requestId" } }`.
  Stack traces are never returned. Every response carries `X-Request-Id`
  (an inbound `X-Request-Id` is reused if it is a safe token).
- Money is returned as numbers (INR, 2 dp); `DATE` fields as `YYYY-MM-DD`.

List endpoints support, where relevant:

| Parameter              | Example                               |
| ---------------------- | ------------------------------------- |
| Pagination             | `?page=1&limit=10` (max 100)          |
| Search                 | `?search=rahul`                       |
| Sort                   | `?sortBy=createdAt&order=desc`        |
| Filters                | `?status=ACTIVE&insuranceType=HEALTH` |
| Agent filter (admin)   | `?agentId=<uuid>`                     |
| Date range (inclusive) | `?from=2026-01-01&to=2026-12-31`      |

All filtering, sorting and pagination happen in PostgreSQL.

## Database

Schema: [`prisma/schema.prisma`](prisma/schema.prisma). Tables: `users`, `agents`,
`customers`, `policies`, `sold_policies`, `receipts`, `audit_logs`, with foreign
keys (`RESTRICT` on business records) and indexes on the common filters.

Design notes:

- An agent's email is the login email on `users` — it is not duplicated on `agents`.
- `sold_policies.premium` is the price agreed at sale time, so later catalog
  price changes do not rewrite history.
- Health/motor-specific policy fields live in `policies.categoryDetails` (JSON),
  validated by the API against `insuranceType`.
- Receipts lock their sold policy row (`SELECT … FOR UPDATE`) so concurrent
  payments cannot exceed the premium. When fully paid, the sale becomes
  `PAID` / `ACTIVE`.

Create a new migration after changing the schema:

```bash
npm run db:migrate -- --name describe_the_change
```

## Testing

```bash
npm test                                  # unit tests; DB tests are skipped
TEST_DATABASE_URL=postgresql://…/insurex_test npm test
```

Integration tests apply migrations to `TEST_DATABASE_URL`, **truncate all tables**
between tests, and refuse to run if it equals `DATABASE_URL`. They use an injected
fake token verifier; real Firebase verification is exercised manually (a real
Google sign-in is required).

## Deployment

1. Provision PostgreSQL and set the environment variables above
   (`NODE_ENV=production`, `FRONTEND_URL=https://insurex-prime.vercel.app`).
2. `npm ci && npm run build && npm run db:deploy`
3. `npm start`

Any Node host that runs a long-lived process works (Render, Railway, Fly.io,
Cloud Run, a VM). Then point the frontend at it with `VITE_API_BASE_URL`.

## Known limitations / next steps

- No rate limiting yet — add `@fastify/rate-limit` (or rate-limit at the edge).
- Search uses `ILIKE '%term%'`; add `pg_trgm` indexes if tables grow large.
- `@prisma/adapter-pg` 7.10 emits a `pg` deprecation warning inside transactions
  (upstream; harmless on `pg` 8).
