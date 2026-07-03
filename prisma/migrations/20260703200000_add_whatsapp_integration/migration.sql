-- CreateTable
CREATE TABLE "whatsapp_groups" (
    "id" TEXT NOT NULL,
    "groupJid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoTicket" BOOLEAN NOT NULL DEFAULT true,
    "autoReply" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_groups_groupJid_key" ON "whatsapp_groups"("groupJid");

-- CreateIndex
CREATE INDEX "whatsapp_groups_companyId_idx" ON "whatsapp_groups"("companyId");

-- AddForeignKey
ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "waMessageId" TEXT NOT NULL,
    "groupJid" TEXT NOT NULL,
    "senderJid" TEXT NOT NULL,
    "senderName" TEXT,
    "body" TEXT NOT NULL,
    "ticketId" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "agentAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_waMessageId_key" ON "whatsapp_messages"("waMessageId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_groupJid_createdAt_idx" ON "whatsapp_messages"("groupJid", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_ticketId_idx" ON "whatsapp_messages"("ticketId");

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_groupJid_fkey" FOREIGN KEY ("groupJid") REFERENCES "whatsapp_groups"("groupJid") ON DELETE CASCADE ON UPDATE CASCADE;
