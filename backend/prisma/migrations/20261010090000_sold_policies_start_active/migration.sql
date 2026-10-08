-- New sales start ACTIVE; there is no "pending" policy state any more.
-- The PENDING enum value is kept so the change is reversible, but nothing uses it.
UPDATE "sold_policies" SET "policyStatus" = 'ACTIVE' WHERE "policyStatus" = 'PENDING';
