-- Data migration (owner request, 2026-10-12): put Skills into one set of categories (Languages, Frontend,
-- Backend, Mobile, Data, Tools) with correct product spellings, then add any Technology still missing from
-- Skills. Follows 20261012150000_skills_from_technologies, which copied Technologies with their own categories.
-- The Technology table is NOT changed here. Names are matched case-insensitively; anything not in the list
-- keeps its own name and category. Running it again changes nothing.

CREATE TEMP TABLE "_skill_map" ("old_name" TEXT, "new_name" TEXT, "category" TEXT);
INSERT INTO "_skill_map" VALUES
  ('C',            'C',            'Languages'),
  ('C#',           'C#',           'Languages'),
  ('Java',         'Java',         'Languages'),
  ('Javascript',   'JavaScript',   'Languages'),
  ('Python',       'Python',       'Languages'),
  ('TypeScript',   'TypeScript',   'Languages'),
  ('HTML',         'HTML',         'Frontend'),
  ('CSS',          'CSS',          'Frontend'),
  ('React JS',     'React',        'Frontend'),
  ('React',        'React',        'Frontend'),
  ('Next.js',      'Next.js',      'Frontend'),
  ('Tailwind CSS', 'Tailwind CSS', 'Frontend'),
  ('Bootstrap',    'Bootstrap',    'Frontend'),
  ('Express.js',   'Express.js',   'Backend'),
  ('.NET',         '.NET',         'Backend'),
  ('socket.io',    'Socket.IO',    'Backend'),
  ('React Native', 'React Native', 'Mobile'),
  ('Expo',         'Expo',         'Mobile'),
  ('PostgreSQL',   'PostgreSQL',   'Data'),
  ('MySQL',        'MySQL',        'Data'),
  ('Figma',        'Figma',        'Tools'),
  ('Vercel',       'Vercel',       'Tools'),
  ('Outsystem',    'OutSystems',   'Tools'),
  ('OutSystems',   'OutSystems',   'Tools');

-- 1. Existing skills: same spelling and category. If one name exists in several categories, only the oldest
--    row is moved, so two rows never land on the same category and name.
UPDATE "Skill" s
SET "name" = m."new_name", "category" = m."category", "updatedAt" = CURRENT_TIMESTAMP
FROM "_skill_map" m
WHERE lower(btrim(s."name")) = lower(m."old_name")
  AND s."id" IN (
    SELECT DISTINCT ON (lower(m2."new_name")) s2."id"
    FROM "Skill" s2 JOIN "_skill_map" m2 ON lower(btrim(s2."name")) = lower(m2."old_name")
    ORDER BY lower(m2."new_name"), s2."createdAt", s2."id"
  )
  AND NOT EXISTS (SELECT 1 FROM "Skill" o WHERE o."id" <> s."id" AND o."category" = m."category" AND lower(o."name") = lower(m."new_name"));

-- 2. Any remaining "Web" skill becomes "Frontend".
UPDATE "Skill" s
SET "category" = 'Frontend', "updatedAt" = CURRENT_TIMESTAMP
WHERE s."category" = 'Web'
  AND NOT EXISTS (SELECT 1 FROM "Skill" o WHERE o."category" = 'Frontend' AND lower(o."name") = lower(s."name"));

-- 3. Add every Technology as a published skill (corrected name and category), unless a skill with that name
--    already exists in any category. Unlisted technologies keep their own category, or "Other" if none.
--    sortOrder 0 = alphabetical within each category.
INSERT INTO "Skill" ("id", "name", "category", "sortOrder", "status", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  x."name",
  x."category",
  0,
  'PUBLISHED',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT
    COALESCE(m."new_name", btrim(t."name")) AS "name",
    COALESCE(m."category", NULLIF(btrim(t."category"), ''), 'Other') AS "category"
  FROM "Technology" t
  LEFT JOIN "_skill_map" m ON lower(btrim(t."name")) = lower(m."old_name")
) x
WHERE NOT EXISTS (SELECT 1 FROM "Skill" s WHERE lower(btrim(s."name")) = lower(x."name"))
ON CONFLICT ("category", "name") DO NOTHING;

DROP TABLE "_skill_map";
