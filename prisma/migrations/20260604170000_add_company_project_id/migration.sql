-- AlterTable
ALTER TABLE "companies" ADD COLUMN "projectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "companies_projectId_key" ON "companies"("projectId");
