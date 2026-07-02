-- Backfill reciprocal ticket relations.
-- Older relations were stored one-sided (esp. symmetric types like RELATES_TO),
-- so the link only showed on the source ticket. Insert the missing reciprocal
-- row for every relation that doesn't already have one. Idempotent: the
-- NOT EXISTS guard matches the (source, target, type) unique key, so re-running
-- inserts nothing.

INSERT INTO "ticket_relations" ("id", "sourceTicketId", "targetTicketId", "relationType", "createdAt", "createdById")
SELECT
  md5(random()::text || clock_timestamp()::text || r."id") AS id,
  r."targetTicketId",
  r."sourceTicketId",
  (CASE r."relationType"::text
     WHEN 'BLOCKS' THEN 'BLOCKED_BY'
     WHEN 'BLOCKED_BY' THEN 'BLOCKS'
     ELSE r."relationType"::text
   END)::"TicketRelationType",
  NOW(),
  r."createdById"
FROM "ticket_relations" r
WHERE NOT EXISTS (
  SELECT 1
  FROM "ticket_relations" x
  WHERE x."sourceTicketId" = r."targetTicketId"
    AND x."targetTicketId" = r."sourceTicketId"
    AND x."relationType" = (CASE r."relationType"::text
        WHEN 'BLOCKS' THEN 'BLOCKED_BY'
        WHEN 'BLOCKED_BY' THEN 'BLOCKS'
        ELSE r."relationType"::text
      END)::"TicketRelationType"
);
