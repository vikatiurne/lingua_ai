-- Vocabulary learning state: unlearned / learned groups on the vocabulary dashboard
CREATE TYPE "VocabularyStatus" AS ENUM ('learning', 'learned');

ALTER TABLE "user_errors" ADD COLUMN "learningStatus" "VocabularyStatus" NOT NULL DEFAULT 'learning';

CREATE INDEX "user_errors_userId_learningStatus_idx" ON "user_errors"("userId", "learningStatus");
