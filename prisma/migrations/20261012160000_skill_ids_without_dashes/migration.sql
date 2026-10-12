-- The skills copied from technologies got UUID ids with dashes, which the admin's id check refuses
-- (it accepts letters and digits only), so their edit pages showed "not found". Nothing references
-- Skill ids, so the dashes can simply be removed; the result (32 hex characters) passes the check.
UPDATE "Skill" SET "id" = replace("id", '-', '') WHERE "id" LIKE '%-%';
