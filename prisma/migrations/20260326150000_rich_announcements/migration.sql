ALTER TABLE "Announcement" ALTER COLUMN "description" TYPE TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "imagePublicId" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Announcement_isPinned_createdAt_idx" ON "Announcement"("isPinned", "createdAt");
