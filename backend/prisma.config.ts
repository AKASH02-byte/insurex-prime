import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma CLI does not load .env automatically; do it here for local development.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Not required for `prisma generate`; required for migrate/seed/studio.
    url: process.env.DATABASE_URL ?? "",
  },
});
