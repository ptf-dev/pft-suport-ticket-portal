-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM (
    'CREATED',
    'EDITED',
    'DELETED',
    'RESTORED',
    'STATUS_CHANGED',
    'PRIORITY_CHANGED',
    'ASSIGNED',
    'UNASSIGNED',
    'SCHEDULED',
    'UNSCHEDULED',
    'CATEGORY_CHANGED',
    'COMMENTED',
    'COMMENT_EDITED',
    'COMMENT_DELETED',
    'INTERNAL_NOTE',
    'IMAGE_UPLOADED',
    'IMAGE_DELETED',
    'RELATION_ADDED',
    'RELATION_REMOVED',
    'MENTIONED'
);

-- CreateTable
CREATE TABLE "ticket_activities" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "ActivityType" NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "message" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_activities_ticketId_createdAt_idx" ON "ticket_activities"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "ticket_activities_createdAt_idx" ON "ticket_activities"("createdAt");

-- CreateIndex
CREATE INDEX "ticket_activities_type_idx" ON "ticket_activities"("type");

-- CreateIndex
CREATE INDEX "tickets_updatedAt_idx" ON "tickets"("updatedAt");

-- CreateIndex
CREATE INDEX "tickets_companyId_isDeleted_updatedAt_idx" ON "tickets"("companyId", "isDeleted", "updatedAt");

-- AddForeignKey
ALTER TABLE "ticket_activities" ADD CONSTRAINT "ticket_activities_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_activities" ADD CONSTRAINT "ticket_activities_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
