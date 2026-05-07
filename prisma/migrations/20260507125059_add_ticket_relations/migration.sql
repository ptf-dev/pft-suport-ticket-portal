-- CreateEnum
CREATE TYPE "TicketRelationType" AS ENUM ('BLOCKS', 'BLOCKED_BY', 'RELATES_TO', 'IS_IDEA_FOR', 'WILL_IMPLEMENT_AFTER', 'ADDED_TO_ROADMAP');

-- CreateTable
CREATE TABLE "ticket_relations" (
    "id" TEXT NOT NULL,
    "sourceTicketId" TEXT NOT NULL,
    "targetTicketId" TEXT NOT NULL,
    "relationType" "TicketRelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "ticket_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_relations_sourceTicketId_idx" ON "ticket_relations"("sourceTicketId");

-- CreateIndex
CREATE INDEX "ticket_relations_targetTicketId_idx" ON "ticket_relations"("targetTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_relations_sourceTicketId_targetTicketId_relationType_key" ON "ticket_relations"("sourceTicketId", "targetTicketId", "relationType");

-- AddForeignKey
ALTER TABLE "ticket_relations" ADD CONSTRAINT "ticket_relations_sourceTicketId_fkey" FOREIGN KEY ("sourceTicketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_relations" ADD CONSTRAINT "ticket_relations_targetTicketId_fkey" FOREIGN KEY ("targetTicketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_relations" ADD CONSTRAINT "ticket_relations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
