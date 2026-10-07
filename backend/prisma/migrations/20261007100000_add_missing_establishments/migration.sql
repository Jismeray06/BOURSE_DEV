-- Établissements et antennes de l'Université de Mahajanga absents de la liste initiale.
-- Insertion idempotente : un établissement déjà présent (même nom) n'est ni modifié ni dupliqué.
INSERT INTO "Establishment" ("id", "name", "position", "updatedAt")
SELECT
  gen_random_uuid()::text,
  missing."name",
  COALESCE((SELECT MAX("position") FROM "Establishment"), 0) + missing."rank",
  CURRENT_TIMESTAMP
FROM (VALUES
  ('École de Vétérinaire', 1),
  ('Écoles doctorales', 2),
  ('IUGM Antsohihy', 3),
  ('IUGM Maevatanana', 4),
  ('EDSP Antsohihy', 5),
  ('UFRSS Mandritsara', 6)
) AS missing("name", "rank")
ON CONFLICT ("name") DO NOTHING;
