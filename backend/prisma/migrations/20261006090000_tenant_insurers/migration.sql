-- A tenant can now sell for several insurers. The tenant's single insurer and codes move to
-- tenant_insurers, and every category and policy records which insurer it belongs to.

-- CreateTable
CREATE TABLE "tenant_insurers" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "insurerId" UUID NOT NULL,
    "businessCode" TEXT NOT NULL,
    "licenceCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_insurers_pkey" PRIMARY KEY ("id")
);

-- Backfill: each existing tenant keeps its current insurer and codes.
INSERT INTO "tenant_insurers" ("id", "tenantId", "insurerId", "businessCode", "licenceCode", "updatedAt")
SELECT gen_random_uuid(), "id", "insurerId", "businessCode", "licenceCode", CURRENT_TIMESTAMP FROM "tenants";

-- AlterTable: insurer on categories and policies (backfilled from the tenant's insurer).
ALTER TABLE "policy_categories" ADD COLUMN "insurerId" UUID;
ALTER TABLE "policies" ADD COLUMN "insurerId" UUID;
UPDATE "policy_categories" c SET "insurerId" = t."insurerId" FROM "tenants" t WHERE t."id" = c."tenantId";
UPDATE "policies" p SET "insurerId" = t."insurerId" FROM "tenants" t WHERE t."id" = p."tenantId";
ALTER TABLE "policy_categories" ALTER COLUMN "insurerId" SET NOT NULL;
ALTER TABLE "policies" ALTER COLUMN "insurerId" SET NOT NULL;

-- AlterTable: the tenant no longer has a single insurer.
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_insurerId_fkey";
DROP INDEX "tenants_insurerId_businessCode_key";
ALTER TABLE "tenants" DROP COLUMN "insurerId", DROP COLUMN "businessCode", DROP COLUMN "licenceCode";

-- DropIndex
DROP INDEX "policy_categories_tenantId_line_parentId_idx";
DROP INDEX "policies_tenantId_insuranceType_status_idx";

-- CreateIndex
CREATE INDEX "tenant_insurers_tenantId_idx" ON "tenant_insurers"("tenantId");
CREATE UNIQUE INDEX "tenant_insurers_tenantId_insurerId_key" ON "tenant_insurers"("tenantId", "insurerId");
CREATE UNIQUE INDEX "tenant_insurers_insurerId_businessCode_key" ON "tenant_insurers"("insurerId", "businessCode");
CREATE INDEX "policy_categories_tenantId_insurerId_line_parentId_idx" ON "policy_categories"("tenantId", "insurerId", "line", "parentId");
CREATE INDEX "policies_tenantId_insurerId_insuranceType_status_idx" ON "policies"("tenantId", "insurerId", "insuranceType", "status");

-- AddForeignKey
ALTER TABLE "tenant_insurers" ADD CONSTRAINT "tenant_insurers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_insurers" ADD CONSTRAINT "tenant_insurers_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "policy_categories" ADD CONSTRAINT "policy_categories_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "policies" ADD CONSTRAINT "policies_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
