-- CreateTable
CREATE TABLE "whatsapp_users" (
    "id" TEXT NOT NULL,
    "waJid" TEXT NOT NULL,
    "displayName" TEXT,
    "companyId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "agentMode" "WhatsappAgentMode" NOT NULL DEFAULT 'FREE_CHAT',
    "mentionOnly" BOOLEAN NOT NULL DEFAULT false,
    "autoTicket" BOOLEAN NOT NULL DEFAULT true,
    "autoReply" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "whatsapp_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_users_waJid_key" ON "whatsapp_users"("waJid");
CREATE INDEX "whatsapp_users_companyId_idx" ON "whatsapp_users"("companyId");

ALTER TABLE "whatsapp_users" ADD CONSTRAINT "whatsapp_users_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
