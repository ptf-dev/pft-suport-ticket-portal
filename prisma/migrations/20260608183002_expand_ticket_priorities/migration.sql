-- AlterEnum
-- Expands TicketPriority from a 4-level to a 7-level scale.
-- Existing values (LOW, MEDIUM, HIGH, URGENT) are preserved, so no row data
-- needs to be remapped. New values are inserted positionally so the Postgres
-- enum sort order matches the intended low -> high priority ladder:
--   BACKLOG < LOW < MEDIUM < HIGH < EXTRA_HIGH < URGENT < ULTRA_URGENT
-- This keeps `ORDER BY priority` (used by the admin ticket list) correct.
ALTER TYPE "TicketPriority" ADD VALUE IF NOT EXISTS 'BACKLOG' BEFORE 'LOW';
ALTER TYPE "TicketPriority" ADD VALUE IF NOT EXISTS 'EXTRA_HIGH' AFTER 'HIGH';
ALTER TYPE "TicketPriority" ADD VALUE IF NOT EXISTS 'ULTRA_URGENT' AFTER 'URGENT';
