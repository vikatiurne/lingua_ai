-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CEFRLevel" AS ENUM ('A1', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('not_started', 'in_progress', 'mastered', 'needs_review');

-- CreateEnum
CREATE TYPE "ExerciseStatus" AS ENUM ('generated', 'in_progress', 'evaluated', 'reviewed');

-- CreateEnum
CREATE TYPE "ErrorType" AS ENUM ('topic', 'general');

-- CreateEnum
CREATE TYPE "SentenceDirection" AS ENUM ('uk_en', 'en_uk');

-- CreateEnum
CREATE TYPE "ErrorRecyclingStatus" AS ENUM ('active', 'archived_success', 'archived_stuck');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "level" "CEFRLevel",
    "targetLevel" "CEFRLevel",
    "dailyMinutes" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "CEFRLevel" NOT NULL,
    "topicName" TEXT NOT NULL,
    "subtopicName" TEXT,
    "templateId" TEXT,
    "status" "ProgressStatus" NOT NULL DEFAULT 'not_started',
    "score" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastPracticed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "CEFRLevel" NOT NULL,
    "content" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "level" "CEFRLevel" NOT NULL,
    "topicName" TEXT NOT NULL,
    "subtopicName" TEXT,
    "templateIds" TEXT[],
    "sentences" JSONB NOT NULL,
    "topicScore" DOUBLE PRECISION,
    "grammarScore" DOUBLE PRECISION,
    "status" "ExerciseStatus" NOT NULL DEFAULT 'generated',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_errors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "type" "ErrorType" NOT NULL,
    "sentence" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "category" TEXT,
    "word" TEXT,
    "translation" TEXT,
    "timesRecycled" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ErrorRecyclingStatus" NOT NULL DEFAULT 'active',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "icsToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_progress_userId_level_idx" ON "user_progress"("userId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_userId_level_topicName_subtopicName_templateI_key" ON "user_progress"("userId", "level", "topicName", "subtopicName", "templateId");

-- CreateIndex
CREATE INDEX "plans_userId_isActive_idx" ON "plans"("userId", "isActive");

-- CreateIndex
CREATE INDEX "exercises_userId_status_idx" ON "exercises"("userId", "status");

-- CreateIndex
CREATE INDEX "exercises_userId_level_idx" ON "exercises"("userId", "level");

-- CreateIndex
CREATE INDEX "user_errors_userId_type_idx" ON "user_errors"("userId", "type");

-- CreateIndex
CREATE INDEX "user_errors_userId_status_idx" ON "user_errors"("userId", "status");

-- CreateIndex
CREATE INDEX "user_errors_exerciseId_idx" ON "user_errors"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_icsToken_key" ON "calendar_events"("icsToken");

-- CreateIndex
CREATE INDEX "calendar_events_userId_scheduledAt_idx" ON "calendar_events"("userId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_errors" ADD CONSTRAINT "user_errors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_errors" ADD CONSTRAINT "user_errors_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

