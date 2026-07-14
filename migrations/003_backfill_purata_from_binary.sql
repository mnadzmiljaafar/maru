-- Migration: backfill the overall PURATA (TP1-TP6) for past subtopic-based
-- assessments whose original TP data was already converted to the binary scale.
--
-- The true historical average is unrecoverable (the per-subtopic TP values were
-- overwritten with 'M'/'TM'), so this APPROXIMATES the PURATA from each student's
-- current mastery proportion p = (# Menguasai) / (# rated subtopics):
--     TP level = clamp( 1 + round(p * 5), 1..6 )
--   p = 1.00 -> TP6 | p = 0.80 -> TP5 | p = 0.60 -> TP4
--   p = 0.40 -> TP3 | p = 0.20 -> TP2 | p = 0.00 -> TP1
--
-- Safe / idempotent:
--   * Only students with at least one rated subtopic get a PURATA.
--   * Teacher-set PURATA rows (non-null overall rows) are left untouched.
--   * Empty (null) overall rows are filled; missing ones are inserted.
--
--   psql "$DATABASE_URL" -f migrations/003_backfill_purata_from_binary.sql

WITH counts AS (
  SELECT
    r.assessment_id,
    r.student_id,
    count(*) FILTER (WHERE r.rating_type = 'M')::numeric AS mastered,
    count(*)::numeric AS total
  FROM ratings r
  WHERE r.subtopic_id IS NOT NULL
    AND r.rating_type IN ('M', 'TM')
    AND EXISTS (SELECT 1 FROM subtopics s WHERE s.assessment_id = r.assessment_id)
  GROUP BY r.assessment_id, r.student_id
),
target AS (
  SELECT
    assessment_id,
    student_id,
    'TP' || GREATEST(1, LEAST(6, (1 + round((mastered / total) * 5))::int)) AS tp
  FROM counts
)
-- Fill existing empty overall rows.
UPDATE ratings r
SET rating_type = t.tp, updated_at = CURRENT_TIMESTAMP
FROM target t
WHERE r.assessment_id = t.assessment_id
  AND r.student_id = t.student_id
  AND r.subtopic_id IS NULL
  AND r.rating_type IS NULL;

-- Insert overall rows where none exists yet.
WITH counts AS (
  SELECT
    r.assessment_id,
    r.student_id,
    count(*) FILTER (WHERE r.rating_type = 'M')::numeric AS mastered,
    count(*)::numeric AS total
  FROM ratings r
  WHERE r.subtopic_id IS NOT NULL
    AND r.rating_type IN ('M', 'TM')
    AND EXISTS (SELECT 1 FROM subtopics s WHERE s.assessment_id = r.assessment_id)
  GROUP BY r.assessment_id, r.student_id
),
target AS (
  SELECT
    assessment_id,
    student_id,
    'TP' || GREATEST(1, LEAST(6, (1 + round((mastered / total) * 5))::int)) AS tp
  FROM counts
)
INSERT INTO ratings (student_id, assessment_id, subtopic_id, rating_type)
SELECT t.student_id, t.assessment_id, NULL, t.tp
FROM target t
WHERE NOT EXISTS (
  SELECT 1 FROM ratings r
  WHERE r.assessment_id = t.assessment_id
    AND r.student_id = t.student_id
    AND r.subtopic_id IS NULL
);
