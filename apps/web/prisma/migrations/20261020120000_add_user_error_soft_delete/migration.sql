-- Soft-delete flag for vocabulary words (task: Review Words UX)
ALTER TABLE "user_errors" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
