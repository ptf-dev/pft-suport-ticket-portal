-- Repoint existing reciprocal rows at the new opposite types.
--
-- Each relation is stored as two rows (A->B and B->A). For the three broken
-- directional types both rows share one type; the ORIGINAL row is the one
-- created first (ties broken by id, since the reciprocal is inserted second in
-- the same transaction and gets the higher cuid counter). Only the later row of
-- each pair is rewritten, so the direction the user chose is preserved.
--
-- Must be a separate migration from the ALTER TYPE above: Postgres refuses to
-- use a newly added enum value inside the transaction that added it.
UPDATE "ticket_relations" r
SET "relationType" = (
  CASE r."relationType"
    WHEN 'IS_IDEA_FOR'          THEN 'HAS_IDEA'
    WHEN 'WILL_IMPLEMENT_AFTER' THEN 'WILL_BE_IMPLEMENTED_BEFORE'
    WHEN 'ADDED_TO_ROADMAP'     THEN 'ROADMAP_INCLUDES'
  END
)::"TicketRelationType"
FROM "ticket_relations" o
WHERE o."sourceTicketId" = r."targetTicketId"
  AND o."targetTicketId" = r."sourceTicketId"
  AND o."relationType"   = r."relationType"
  AND r."relationType" IN ('IS_IDEA_FOR', 'WILL_IMPLEMENT_AFTER', 'ADDED_TO_ROADMAP')
  AND (o."createdAt" < r."createdAt" OR (o."createdAt" = r."createdAt" AND o."id" < r."id"));
