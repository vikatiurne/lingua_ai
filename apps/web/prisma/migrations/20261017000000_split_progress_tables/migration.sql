-- DropForeignKey
ALTER TABLE "user_progress" DROP CONSTRAINT "user_progress_userId_fkey";

-- DropTable
DROP TABLE "user_progress";

-- CreateTable
CREATE TABLE "topic_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "CEFRLevel" NOT NULL,
    "topicName" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'not_started',
    "score" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastPracticed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "CEFRLevel" NOT NULL,
    "topicName" TEXT NOT NULL,
    "subtopicName" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'not_started',
    "score" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastPracticed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topic_progress_userId_level_idx" ON "topic_progress"("userId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "topic_progress_userId_level_topicName_key" ON "topic_progress"("userId", "level", "topicName");

-- CreateIndex
CREATE INDEX "exercise_progress_userId_level_idx" ON "exercise_progress"("userId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_progress_userId_level_topicName_subtopicName_templ_key" ON "exercise_progress"("userId", "level", "topicName", "subtopicName", "templateId");

-- AddForeignKey
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_progress" ADD CONSTRAINT "exercise_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
