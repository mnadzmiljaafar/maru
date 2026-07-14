-- Migration: convert historical TP ratings to the binary mastery scale.
--
-- Mapping: TP4, TP5, TP6            -> 'M'  (Menguasai)
--          TP1, TP2, TP3, TD        -> 'TM' (Tidak Menguasai)
--
-- IMPORTANT: run 001_binary_ratings.sql FIRST (it widens the CHECK constraint to
-- permit 'M' / 'TM'), otherwise these UPDATEs will fail the constraint.
--
--   psql "$DATABASE_URL" -f migrations/002_convert_tp_to_binary.sql
--
-- This only rewrites rating codes; no rows are added or deleted. It is safe to
-- re-run (rows already in 'M'/'TM' are skipped by the rating_type filter).

-- 1) Per-subtopic ratings are now binary everywhere.
UPDATE ratings
SET rating_type = CASE
      WHEN rating_type IN ('TP4', 'TP5', 'TP6') THEN 'M'
      ELSE 'TM'
    END
WHERE subtopic_id IS NOT NULL
  AND rating_type IN ('TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TD');

-- 2) Overall (subtopic_id IS NULL) ratings for assessments WITHOUT subtopics are
--    the direct rating, which is now binary. Overall rows for assessments WITH
--    subtopics are the editable TP PURATA and are intentionally left unchanged.
UPDATE ratings r
SET rating_type = CASE
      WHEN r.rating_type IN ('TP4', 'TP5', 'TP6') THEN 'M'
      ELSE 'TM'
    END
WHERE r.subtopic_id IS NULL
  AND r.rating_type IN ('TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TD')
  AND NOT EXISTS (
    SELECT 1 FROM subtopics s WHERE s.assessment_id = r.assessment_id
  );
