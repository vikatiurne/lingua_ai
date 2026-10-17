"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CEFR_LEVEL_LABELS, CEFR_LEVELS, type CEFRLevel } from "@lingua/shared";
import type { TestQuestion } from "@/lib/test/loader";
import type { WeakTopic } from "@/lib/test/gap-map";
import {
  getNextQuestion,
  getResult,
  isFinished,
  startTest,
  submitAnswer,
  type AdaptiveState,
} from "@/lib/test/adaptive";
import { LevelLadder } from "./level-ladder";
import { QuestionCard } from "./question-card";
import { TestResult, type SubmitStatus } from "./test-result";

export function TestRunner({ questions }: { questions: TestQuestion[] }) {
  const [state, setState] = useState<AdaptiveState>(() => startTest(questions));
  const [currentQuestion, setCurrentQuestion] = useState<TestQuestion | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const submittedRef = useRef(false);

  const currentLevel = useMemo<CEFRLevel>(
    () => (CEFR_LEVELS[state.currentLevelIndex] ?? CEFR_LEVELS[0]) as CEFRLevel,
    [state.currentLevelIndex],
  );

  const finished = isFinished(state);

  useEffect(() => {
    if (!finished || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitStatus("submitting");

    const result = getResult(state);
    const answers = state.history.map(({ questionId, correct, skipped }) => ({
      questionId,
      correct,
      skipped,
    }));

    fetch("/api/test/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: result.level,
        answers,
        correctCount: result.correctCount,
        totalCount: result.totalCount,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to submit test");
        return res.json();
      })
      .then((data: { weakTopics?: WeakTopic[] }) => {
        setWeakTopics(data.weakTopics ?? []);
        setSubmitStatus("success");
      })
      .catch(() => {
        submittedRef.current = false;
        setSubmitStatus("error");
      });
  }, [finished, state]);

  const handleStart = useCallback(() => {
    const initial = startTest(questions);
    setState(initial);
    setCurrentQuestion(getNextQuestion(initial, questions));
  }, [questions]);

  const handleAnswer = useCallback(
    (correct: boolean, skipped: boolean) => {
      if (!currentQuestion) return;

      const answered: AdaptiveState = {
        ...state,
        askedQuestionIds: new Set(state.askedQuestionIds).add(currentQuestion.id),
      };
      const next = submitAnswer(answered, correct, skipped);
      const nextQuestion = isFinished(next) ? null : getNextQuestion(next, questions);
      setState(next);
      setCurrentQuestion(nextQuestion);
    },
    [currentQuestion, state, questions],
  );

  if (state.totalAsked === 0 && !currentQuestion) {
    return (
      <div className="w-full max-w-2xl space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Адаптивний тест рівня
          </h1>
          <p className="text-muted-foreground">
            Тест визначить ваш рівень A1–C2. Почнемо з рівня A2.
          </p>
        </div>
        <button
          type="button"
          onClick={handleStart}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Почати тест
        </button>
      </div>
    );
  }

  if (finished) {
    const result = getResult(state);
    return (
      <TestResult
        level={result.level}
        correctCount={result.correctCount}
        totalCount={result.totalCount}
        weakTopics={weakTopics}
        status={submitStatus}
      />
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="space-y-3">
        <LevelLadder currentLevel={currentLevel} />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Поточний рівень: {CEFR_LEVEL_LABELS[currentLevel]}</span>
          <span>Питання {state.totalAsked + 1}</span>
        </div>
      </div>
      <QuestionCard
        key={currentQuestion.id}
        question={currentQuestion}
        onAnswer={handleAnswer}
      />
    </div>
  );
}
