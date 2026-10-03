-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InsuranceType" ADD VALUE 'LIFE';
ALTER TYPE "InsuranceType" ADD VALUE 'COMMERCIAL';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TENANT_ADMIN';

-- DropIndex
DROP INDEX "policies_policyCode_key";

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "tenantId" UUID;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "tenantId" UUID;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "tenantId" UUID;

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "categoryId" UUID,
ADD COLUMN     "tenantId" UUID,
ALTER COLUMN "coverageAmount" DROP NOT NULL,
ALTER COLUMN "premium" DROP NOT NULL,
ALTER COLUMN "premiumFrequency" SET DEFAULT 'ANNUAL',
ALTER COLUMN "durationMonths" DROP NOT NULL;

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "tenantId" UUID;

-- AlterTable
ALTER TABLE "sold_policies" ADD COLUMN     "insurerPolicyNumber" TEXT,
ADD COLUMN     "tenantId" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tenantId" UUID;

-- CreateTable
CREATE TABLE "insurers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "insurerId" UUID NOT NULL,
    "businessCode" TEXT NOT NULL,
    "licenceCode" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_categories" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "line" "InsuranceType" NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_categories_pkey" PRIMARY KEY ("id")
);


-- Backfill: existing single-agency data moves into one default tenant (only when data exists).
INSERT INTO "insurers" ("id", "code", "name", "updatedAt")
SELECT gen_random_uuid(), 'DEFAULT', 'Default Insurer', CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "agents") OR EXISTS (SELECT 1 FROM "customers")
   OR EXISTS (SELECT 1 FROM "policies") OR EXISTS (SELECT 1 FROM "sold_policies")
   OR EXISTS (SELECT 1 FROM "receipts");

INSERT INTO "tenants" ("id", "name", "legalName", "insurerId", "businessCode", "licenceCode", "updatedAt")
SELECT gen_random_uuid(), 'Default Tenant', 'Default Tenant', i."id", 'DEFAULT', 'DEFAULT', CURRENT_TIMESTAMP
FROM "insurers" i WHERE i."code" = 'DEFAULT';

UPDATE "agents" SET "tenantId" = (SELECT "id" FROM "tenants" ORDER BY "createdAt" LIMIT 1);
UPDATE "customers" SET "tenantId" = (SELECT "id" FROM "tenants" ORDER BY "createdAt" LIMIT 1);
UPDATE "policies" SET "tenantId" = (SELECT "id" FROM "tenants" ORDER BY "createdAt" LIMIT 1);
UPDATE "sold_policies" SET "tenantId" = (SELECT "id" FROM "tenants" ORDER BY "createdAt" LIMIT 1);
UPDATE "receipts" SET "tenantId" = (SELECT "id" FROM "tenants" ORDER BY "createdAt" LIMIT 1);
UPDATE "audit_logs" SET "tenantId" = (SELECT "id" FROM "tenants" ORDER BY "createdAt" LIMIT 1)
  WHERE "userId" IN (SELECT "id" FROM "users" WHERE "role"::text = 'AGENT');
UPDATE "users" SET "tenantId" = (SELECT "id" FROM "tenants" ORDER BY "createdAt" LIMIT 1)
  WHERE "role"::text = 'AGENT';

ALTER TABLE "agents" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "policies" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "sold_policies" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "receipts" ALTER COLUMN "tenantId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "insurers_code_key" ON "insurers"("code");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_insurerId_businessCode_key" ON "tenants"("insurerId", "businessCode");

-- CreateIndex
CREATE INDEX "policy_categories_tenantId_line_parentId_idx" ON "policy_categories"("tenantId", "line", "parentId");

-- CreateIndex
CREATE INDEX "agents_tenantId_status_idx" ON "agents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");

-- CreateIndex
CREATE INDEX "policies_tenantId_insuranceType_status_idx" ON "policies"("tenantId", "insuranceType", "status");

-- CreateIndex
CREATE INDEX "policies_categoryId_idx" ON "policies"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "policies_tenantId_policyCode_key" ON "policies"("tenantId", "policyCode");

-- CreateIndex
CREATE INDEX "receipts_tenantId_idx" ON "receipts"("tenantId");

-- CreateIndex
CREATE INDEX "sold_policies_tenantId_issueDate_idx" ON "sold_policies"("tenantId", "issueDate");

-- CreateIndex
CREATE INDEX "users_tenantId_role_idx" ON "users"("tenantId", "role");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_categories" ADD CONSTRAINT "policy_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_categories" ADD CONSTRAINT "policy_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "policy_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "policy_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sold_policies" ADD CONSTRAINT "sold_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

