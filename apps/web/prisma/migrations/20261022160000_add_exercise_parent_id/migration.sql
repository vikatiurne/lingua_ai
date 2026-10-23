-- Add parent_exercise_id to tie each review exercise to its specific
-- original exercise instead of to the topic.
ALTER TABLE "exercises" ADD COLUMN "parent_exercise_id" TEXT;

-- Best-effort backfill for existing isReview exercises: link each to the
-- most recent evaluated original exercise in the same topic.
UPDATE "exercises" AS r
SET "parent_exercise_id" = (
  SELECT o.id FROM "exercises" AS o
  WHERE o."userId" = r."userId"
    AND o."level" = r."level"
    AND o."topicName" = r."topicName"
    AND COALESCE(o."subtopicName", '') = COALESCE(r."subtopicName", '')
    AND o."isReview" = false
    AND o."status" = 'evaluated'
    AND o."createdAt" < r."createdAt"
  ORDER BY o."createdAt" DESC
  LIMIT 1
)
WHERE r."isReview" = true
  AND r."parent_exercise_id" IS NULL;

-- Drop the old topic-level unique constraint: we now allow one review per
-- parent exercise, not one per topic.
DROP INDEX IF EXISTS "exercises_one_review_per_topic_idx";

-- Foreign key so a parent exercise can be traced back to the original.
ALTER TABLE "exercises"
  ADD CONSTRAINT "exercises_parent_exercise_id_fkey"
  FOREIGN KEY ("parent_exercise_id") REFERENCES "exercises" ("id")
  ON DELETE SET NULL;

-- Index for reverse lookups (reviews of a given exercise).
CREATE INDEX "exercises_parent_exercise_id_idx" ON "exercises" ("parent_exercise_id");

-- Enforce at most one review exercise per parent exercise.
CREATE UNIQUE INDEX "exercises_one_review_per_exercise_idx"
  ON "exercises" ("parent_exercise_id")
  WHERE "isReview" = true;
