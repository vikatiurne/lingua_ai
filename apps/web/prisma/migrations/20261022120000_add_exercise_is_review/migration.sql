-- Distinguish original exercises from "Work on mistakes" review exercises.
-- One review exercise per topic: it is reused instead of creating a new record.
ALTER TABLE "exercises" ADD COLUMN "isReview" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "exercises_userId_topicName_isReview_idx" ON "exercises"("userId", "topicName", "isReview");
