# InsuroX Prime — Backend API

Node.js + TypeScript API server for InsuroX Prime. Lives alongside the existing
TanStack Start frontend (repository root) and is deployed separately.

| Concern        | Choice                                                         |
| -------------- | -------------------------------------------------------------- |
| HTTP           | Fastify 5                                                      |
| Validation     | Zod 4 via `fastify-type-provider-zod` (requests and responses) |
| Database       | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`)                   |
| Authentication | Firebase ID tokens (Super Admin); agent password + session cookie |
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

No Postgres installed? The bundled PGlite server works for local development:

```bash
node node_modules/@electric-sql/pglite-socket/dist/scripts/server.js \
  --host=:: --port=54329 --max-connections=4 --db=./.pglite/dev   # data kept in .pglite/ (gitignored)
# .env: DATABASE_URL=postgresql://user:pass@localhost:54329/insurex_dev?sslmode=disable
#       DATABASE_POOL_MAX=1   (PGlite mixes up concurrent connections)
```

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
| `DATABASE_URL`                                   | yes      | `postgresql://…` (add `?sslmode=disable` for local servers without SSL, e.g. PGlite)                                        |
| `DATABASE_POOL_MAX`                              | no       | Max DB connections per process (driver default 10). Use `1` with PGlite                                                     |
| `FIREBASE_PROJECT_ID`                            | yes      | Same Firebase project as the frontend (`VITE_FIREBASE_PROJECT_ID`)                                                          |
| `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | no       | Service account. Token verification works without it; with it, revoked tokens are rejected too. Literal `\n` is normalized. |
| `FRONTEND_URL`                                   | prod     | Comma-separated CORS origins, e.g. `http://localhost:8080,https://insurex-prime.vercel.app`. `*` is rejected in production. |
| `SUPER_ADMIN_EMAILS`                             | no       | Comma-separated Google emails provisioned as `SUPER_ADMIN` on first sign-in                                                 |
| `PORT`, `HOST`, `LOG_LEVEL`, `NODE_ENV`          | no       | Defaults: `4000`, `0.0.0.0`, `info`, `development`                                                                          |
| `TRUST_PROXY`                                    | no       | `true` behind a trusted load balancer so audit-log IPs are correct                                                          |
| `DOCS_ENABLED`                                   | no       | `false` hides `/docs`                                                                                                       |
| `AGENT_SESSION_TTL_HOURS`                        | no       | Agent session lifetime. Default `12`                                                                                        |
| `AGENT_COOKIE_SAMESITE`                          | no       | `lax` (default), `strict` or `none`. `none` needs `AGENT_COOKIE_SECURE=true` (see Deployment)                               |
| `AGENT_COOKIE_SECURE`                            | no       | Secure cookie flag. Default `true` in production, `false` otherwise                                                         |
| `AGENT_COOKIE_DOMAIN`                            | no       | Cookie `Domain`, e.g. `.example.com` to share across subdomains                                                             |

Invalid configuration stops the server at startup with a list of the offending
variable **names** (values are never printed).

## Multi-tenancy

One **tenant** is one agency (for example _Aakruthi Enterprises_). It can sell for
**several insurers** (TATA AIA, TATA AIG, LIC, …), each with its own business and
licence codes. Everything an agency owns (agents, customers, policy catalog,
sales, receipts, audit trail) belongs to exactly one tenant and is invisible to
every other tenant. Agents, customers and sales are shared across the agency's
insurers; the catalog is kept per insurer.

```
Platform (SUPER_ADMIN)
 └─ Insurer (TATA_AIA, TATA_AIG, LIC, …)               master data
 └─ Tenant: name, legal name, ONE admin
     ├─ TenantInsurer × n: insurer + business code + licence code
     ├─ Catalog per insurer: line (LIFE | HEALTH | MOTOR | COMMERCIAL) → category → sub-category → policy
     ├─ Agents ─ Customers ─ Sold policies ─ Receipts
```

- **Activation:** `POST /api/v1/platform/tenants` creates the tenant, its single
  `TENANT_ADMIN` (temporary password returned once), its `insurers` (each with
  business and licence codes) and each insurer's starting catalog in one
  transaction. Per insurer, `catalog.source` is `TEMPLATE` (the built-in catalog:
  `TATA_AIA` loads the six Life categories and 47 policies, `TATA_AIG` the four
  MediCare health plans), `CUSTOM` (send `catalog.lines`) or `NONE`.
  `POST /platform/tenants/:id/insurers` adds an insurer later and
  `PATCH /platform/tenants/:id/insurers/:insurerId` changes its codes.
- **Catalog per tenant:** each tenant owns its own copy of the catalog, so one
  tenant can rename, add or hide categories and policies without affecting
  another. Agents fill their dropdowns from `GET /catalog/tree` (insurer → line → category → sub-category → policy; or the flat
  `GET /catalog/categories` and `GET /policies?insurerId=&categoryId=`). With more
  than one insurer, new categories and policies must name their `insurerId`; a
  policy inside a category takes the category's insurer.
- **Isolation:** the tenant always comes from the signed-in user, never from the
  request body. Services use `request.db`, a Prisma client that adds
  `tenantId` to every query on tenant tables and stamps every create
  (`src/config/tenant-db.ts`). The few raw SQL queries (analytics) filter on
  `tenantId` explicitly. A platform `SUPER_ADMIN` has no tenant; to look inside
  one they send `X-Tenant-Id: <tenant uuid>` (ignored for everyone else).
- **No commission maths:** the app records sales that are actually made on the
  insurer's portal. Catalog price, cover and term are optional; when a policy has
  no catalog premium or term, the sale must supply `premium` and `expiryDate`
  (and may store the insurer's own number as `insurerPolicyNumber`).
- **Suspension:** `POST /platform/tenants/:id/suspend` blocks every user of the
  tenant on their next request; `…/activate` restores them.
- **Not done yet:** PostgreSQL row-level security as a second line of defence, and
  the frontend screens for tenant activation and the cascading dropdowns.

## Authentication and roles

```
Google sign-in (frontend) → Firebase → ID token
  → Authorization: Bearer <Firebase ID token>
  → Firebase Admin verifyIdToken → user + role looked up in PostgreSQL → authorized request
```

### Agent sign-in (agent code or email + password)

```
POST /auth/agent/login { identifier, password }
  → scrypt password check → session row (SHA-256 of token) → Set-Cookie: insurex_agent_session (HttpOnly)
  → browser sends the cookie with credentials: "include" → user, role and status re-read on every request
```

- **Passwords:** `POST /agents` returns a server-generated temporary password **once**
  (`temporaryPassword`); only its scrypt hash is stored. `POST /agents/:id/reset-password`
  issues a new one. Agents with a temporary password get `mustChangePassword: true` and
  every endpoint except `/auth/me`, `/auth/agent/change-password` and `/auth/agent/logout`
  returns `403 PASSWORD_CHANGE_REQUIRED` until they choose their own
  (8–128 characters, a letter and a number).
- **Responses:** unknown account or wrong password → `401 INVALID_CREDENTIALS` (same message,
  same timing); correct password for an inactive/suspended agent → `403 ACCOUNT_DISABLED`;
  five failures in 15 minutes per client + identifier → `429`.
- **Sessions:** 12 hours (`AGENT_SESSION_TTL_HOURS`). Logout, password change/reset and
  suspension revoke them in the database. Cookie-authenticated writes must come from an
  origin in `FRONTEND_URL` (CSRF defence on top of `SameSite`). A bearer token, when sent,
  takes precedence over the cookie.
- **Demo data:** `npm run db:seed` gives the fictional agents `AGT-DEMO1`…`AGT-DEMO4`
  (or `demo.agent1@example.com`…) the password `DemoAgent@2026`; `AGT-DEMO4` must change it
  on first sign-in and `AGT-DEMO5` is inactive.

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

`SUPER_ADMIN` is the platform operator: tenants, insurers and system settings.
`TENANT_ADMIN` is the single admin of one tenant and has the "full" rights below
inside that tenant only (shown in the `SUPER_ADMIN` column, which also applies
to a platform admin acting inside a tenant with `X-Tenant-Id`). Tenant admins
sign in with their email and temporary password at `POST /auth/agent/login`, or
with Google if the email is linked.

| Capability                              | TENANT_ADMIN | AGENT                                  |
| --------------------------------------- | ----------- | -------------------------------------- |
| Agents: list / create / update / delete | ✅          | ❌ (can read only their own profile)   |
| Customers                               | all         | only their own; new ones auto-assigned |
| Policies (catalog)                      | full CRUD   | read ACTIVE only                       |
| Sold policies: list / read              | all         | their own                              |
| Sold policies: create / quote           | ✅          | own customers, catalog premium only, issue date −30…+90 days; `paymentMethod` creates the receipt |
| Sold policies: update                   | ✅          | ❌                                     |
| Receipts: list / read / create          | all         | their own sales                        |
| Dashboard                               | whole tenant | their own figures                      |
| `GET /agent/dashboard`, `/agent/profile` | ❌          | ✅ (own data; profile: name/phone/address) |
| Reports, audit logs                     | ✅          | ❌                                     |

Records with history are protected: deleting an agent, customer or policy that
has sales returns `409` — deactivate it instead.

## API conventions

- Base path `/api/v1`. All endpoints except `/health` and agent login/logout require a
  Firebase bearer token or the agent session cookie.
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

### Agent cookies in production

The agent session is a cookie set by the API, so the browser must treat the API as
first-party. Host the API on the same site as the frontend (e.g. `app.example.com` and
`api.example.com`, `AGENT_COOKIE_SAMESITE=lax`). If they must be on different sites (e.g.
`*.vercel.app` + `*.onrender.com`), set `AGENT_COOKIE_SAMESITE=none` and
`AGENT_COOKIE_SECURE=true` — but Safari and other browsers that block third-party cookies
will not keep the session, so prefer a shared site or a proxy.

## Known limitations / next steps

- Login rate limiting is in-memory per process; with several instances, add
  `@fastify/rate-limit` with a shared store (or rate-limit at the edge).
- Expired agent session rows are not purged yet; a periodic
  `DELETE FROM agent_sessions WHERE "expiresAt" < now() - interval '7 days'` is enough.
- Search uses `ILIKE '%term%'`; add `pg_trgm` indexes if tables grow large.
- `@prisma/adapter-pg` 7.10 emits a `pg` deprecation warning inside transactions
  (upstream; harmless on `pg` 8).
