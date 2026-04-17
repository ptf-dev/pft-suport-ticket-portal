-- Add mentionedUsers column to ticket_comments table
ALTER TABLE "ticket_comments" ADD COLUMN "mentionedUsers" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create comment_images table
CREATE TABLE "comment_images" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_images_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "comment_images" ADD CONSTRAINT "comment_images_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ticket_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
