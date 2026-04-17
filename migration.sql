-- Add mentionedUsers column to ticket_comments table
ALTER TABLE "ticket_comments" ADD COLUMN IF NOT EXISTS "mentionedUsers" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create comment_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS "comment_images" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_images_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint (only if table was just created)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comment_images_commentId_fkey'
    ) THEN
        ALTER TABLE "comment_images" ADD CONSTRAINT "comment_images_commentId_fkey" 
            FOREIGN KEY ("commentId") REFERENCES "ticket_comments"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
