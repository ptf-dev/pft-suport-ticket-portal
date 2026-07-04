-- CreateEnum
CREATE TYPE "WhatsappAgentMode" AS ENUM ('SUPPORT', 'HYBRID', 'FREE_CHAT');

-- AlterTable
ALTER TABLE "whatsapp_groups" ADD COLUMN "agentMode" "WhatsappAgentMode" NOT NULL DEFAULT 'HYBRID';
