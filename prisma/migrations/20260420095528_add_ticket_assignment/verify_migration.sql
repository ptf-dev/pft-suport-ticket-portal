-- Verification queries for add_ticket_assignment migration
-- Run these after applying the migration to verify it worked correctly

-- 1. Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets'
  AND column_name IN ('assignedToId', 'assignedAt');

-- Expected result:
-- assignedToId | text | YES
-- assignedAt   | timestamp without time zone | YES

-- 2. Verify index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tickets'
  AND indexname = 'tickets_assignedToId_idx';

-- Expected result:
-- tickets_assignedToId_idx | CREATE INDEX tickets_assignedToId_idx ON public.tickets USING btree ("assignedToId")

-- 3. Verify foreign key constraint was added
SELECT conname, contype, confupdtype, confdeltype
FROM pg_constraint
WHERE conname = 'tickets_assignedToId_fkey';

-- Expected result:
-- tickets_assignedToId_fkey | f | a (CASCADE) | n (SET NULL)

-- 4. Verify existing tickets have null assignment values
SELECT COUNT(*) as total_tickets,
       COUNT(CASE WHEN "assignedToId" IS NULL THEN 1 END) as unassigned_tickets,
       COUNT(CASE WHEN "assignedToId" IS NOT NULL THEN 1 END) as assigned_tickets
FROM tickets;

-- Expected result: All existing tickets should have NULL assignedToId and assignedAt
