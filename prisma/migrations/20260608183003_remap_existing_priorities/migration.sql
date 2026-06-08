-- Data migration: shift every existing ticket up one level in the new 7-level
-- priority ladder (BACKLOG < LOW < MEDIUM < HIGH < EXTRA_HIGH < URGENT < ULTRA_URGENT).
--
--   LOW    -> MEDIUM
--   MEDIUM -> HIGH
--   HIGH   -> EXTRA_HIGH
--   URGENT -> ULTRA_URGENT
--
-- This MUST be a migration separate from (and after) the one that ADDs the new
-- enum values: Postgres forbids using a freshly-added enum value in the same
-- transaction that adds it. By the time this runs, EXTRA_HIGH / ULTRA_URGENT
-- are already committed.
--
-- A single CASE-based UPDATE is used deliberately: it evaluates each row against
-- its ORIGINAL value in one pass, so rows are never double-shifted (which a
-- sequence of per-value UPDATEs would cause, e.g. LOW->MEDIUM then MEDIUM->HIGH).
UPDATE "tickets"
SET "priority" = (
  CASE "priority"
    WHEN 'URGENT' THEN 'ULTRA_URGENT'
    WHEN 'HIGH'   THEN 'EXTRA_HIGH'
    WHEN 'MEDIUM' THEN 'HIGH'
    WHEN 'LOW'    THEN 'MEDIUM'
    ELSE "priority"::text
  END
)::"TicketPriority"
WHERE "priority" IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
