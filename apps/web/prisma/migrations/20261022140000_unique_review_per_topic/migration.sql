-- Hard guarantee: a user can have only one review exercise per topic.
-- Prisma schema cannot express a partial/expression index, so it is not listed
-- in schema.prisma. Keep it when generating new migrations (prisma migrate
-- diff would suggest dropping it).

-- Drop legacy duplicates first (keep the newest one per topic).
DELETE FROM "exercises" older
USING "exercises" newer
WHERE older."isReview" = true
  AND newer."isReview" = true
  AND older."userId" = newer."userId"
  AND older."level" = newer."level"
  AND older."topicName" = newer."topicName"
  AND COALESCE(older."subtopicName", '') = COALESCE(newer."subtopicName", '')
  AND older."createdAt" < newer."createdAt";

CREATE UNIQUE INDEX "exercises_one_review_per_topic_idx"
ON "exercises" ("userId", "level", "topicName", COALESCE("subtopicName", ''))
WHERE "isReview" = true;
