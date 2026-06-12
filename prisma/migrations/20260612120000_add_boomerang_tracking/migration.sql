-- Boomerang tracking: surface tickets that bounced back from WAITING_CLIENT
-- into OPEN/IN_PROGRESS (dev thought they were done, the client disagreed).

-- AlterTable
ALTER TABLE "tickets"
  ADD COLUMN "bounceCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reopenedAt" TIMESTAMP(3),
  ADD COLUMN "reopenedByRole" "Role";

-- CreateIndex
CREATE INDEX "tickets_bounceCount_idx" ON "tickets"("bounceCount");

-- Backfill from existing status-change history in ticket_activities.
WITH bounces AS (
  SELECT a."ticketId" AS ticket_id,
         COUNT(*)::int AS cnt,
         MAX(a."createdAt") AS last_at
  FROM "ticket_activities" a
  WHERE a."type" = 'STATUS_CHANGED'
    AND a."fromValue" = 'WAITING_CLIENT'
    AND a."toValue" IN ('OPEN', 'IN_PROGRESS')
  GROUP BY a."ticketId"
),
last_actor AS (
  SELECT DISTINCT ON (a."ticketId") a."ticketId" AS ticket_id, u."role" AS role
  FROM "ticket_activities" a
  LEFT JOIN "users" u ON u."id" = a."actorId"
  WHERE a."type" = 'STATUS_CHANGED'
    AND a."fromValue" = 'WAITING_CLIENT'
    AND a."toValue" IN ('OPEN', 'IN_PROGRESS')
  ORDER BY a."ticketId", a."createdAt" DESC
)
UPDATE "tickets" t
SET "bounceCount" = b.cnt,
    "reopenedAt" = b.last_at,
    "reopenedByRole" = la.role
FROM bounces b
LEFT JOIN last_actor la ON la.ticket_id = b.ticket_id
WHERE t."id" = b.ticket_id;
