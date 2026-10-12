-- Data migration: copy every Technology into Skill as a published skill, sorted into the portfolio's
-- skill categories with each product's proper spelling. A technology not in the map keeps its own
-- name and category ("Other" if it has none). Nothing is added twice: a technology is skipped when a
-- skill with its name (or its corrected name) already exists in any category, ignoring case.
-- sortOrder 0: the public Skills section then lists each category alphabetically.

-- "Web" is now split into Frontend and Backend; existing Web skills (e.g. Next.js) move to Frontend.
UPDATE "Skill" s SET "category" = 'Frontend', "updatedAt" = CURRENT_TIMESTAMP
WHERE s."category" = 'Web'
  AND NOT EXISTS (SELECT 1 FROM "Skill" f WHERE f."category" = 'Frontend' AND f."name" = s."name");

WITH map (tech, name, category) AS (
  VALUES
    ('c', 'C', 'Languages'),
    ('c#', 'C#', 'Languages'),
    ('java', 'Java', 'Languages'),
    ('javascript', 'JavaScript', 'Languages'),
    ('python', 'Python', 'Languages'),
    ('typescript', 'TypeScript', 'Languages'),
    ('html', 'HTML', 'Frontend'),
    ('css', 'CSS', 'Frontend'),
    ('react js', 'React', 'Frontend'),
    ('react.js', 'React', 'Frontend'),
    ('react', 'React', 'Frontend'),
    ('next.js', 'Next.js', 'Frontend'),
    ('tailwind css', 'Tailwind CSS', 'Frontend'),
    ('bootstrap', 'Bootstrap', 'Frontend'),
    ('express.js', 'Express.js', 'Backend'),
    ('.net', '.NET', 'Backend'),
    ('socket.io', 'Socket.IO', 'Backend'),
    ('react native', 'React Native', 'Mobile'),
    ('expo', 'Expo', 'Mobile'),
    ('postgresql', 'PostgreSQL', 'Data'),
    ('mysql', 'MySQL', 'Data'),
    ('figma', 'Figma', 'Tools'),
    ('vercel', 'Vercel', 'Tools'),
    ('outsystem', 'OutSystems', 'Tools'),
    ('outsystems', 'OutSystems', 'Tools')
)
INSERT INTO "Skill" ("id", "name", "category", "sortOrder", "status", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  COALESCE(m.name, btrim(t."name")),
  COALESCE(m.category, NULLIF(btrim(t."category"), ''), 'Other'),
  0,
  'PUBLISHED',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Technology" t
LEFT JOIN map m ON m.tech = lower(btrim(t."name"))
WHERE NOT EXISTS (
  SELECT 1 FROM "Skill" s
  WHERE lower(btrim(s."name")) IN (lower(btrim(t."name")), lower(COALESCE(m.name, btrim(t."name"))))
)
ON CONFLICT ("category", "name") DO NOTHING;
