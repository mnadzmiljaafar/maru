-- Migration: allow binary mastery ratings ('M' = Menguasai, 'TM' = Tidak Menguasai)
-- alongside the existing TP levels used for the editable overall (PURATA) rating.
--
-- Run this against the live database once:
--   psql "$DATABASE_URL" -f migrations/001_binary_ratings.sql

ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_rating_type_check;

ALTER TABLE ratings
  ADD CONSTRAINT ratings_rating_type_check
  CHECK (rating_type IS NULL OR rating_type IN ('TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TD', 'M', 'TM'));
