-- Add flag marking words saved to internal trainers (Flashcards/Spelling)
ALTER TABLE "user_errors" ADD COLUMN "isSavedToTraining" BOOLEAN NOT NULL DEFAULT false;
