"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

import {
  ExerciseForm,
  type ExerciseAppSentence,
} from "@/components/exercise/exercise-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type GenerateResponse = {
  exerciseId: string;
  sentences: ExerciseAppSentence[];
  isFallback: boolean;
};

const COUNT_MIN = 0;
const COUNT_MAX = 20;
const COUNT_DEFAULT = 5;

const LOADING_STEPS = [
  { afterMs: 0, text: "Аналізуємо тему..." },
  { afterMs: 2000, text: "Генеруємо речення..." },
  { afterMs: 4000, text: "Перевіряємо граматику..." },
  { afterMs: 6000, text: "Звіряємо переклади..." },
  { afterMs: 8000, text: "Майже готово..." },
] as const;

function parseCount(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return COUNT_DEFAULT;
  return Math.min(COUNT_MAX, Math.max(COUNT_MIN, parsed));
}

function LoadingBlock({ step }: { step: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {LOADING_STEPS[step]?.text ?? LOADING_STEPS[0].text}
      </CardContent>
    </Card>
  );
}

function ExerciseAppContent() {
  const searchParams = useSearchParams();
  const level = searchParams.get("level");
  const topic = searchParams.get("topic");
  const subtopic = searchParams.get("subtopic");
  const ukEn = searchParams.get("ukEn");
  const enUk = searchParams.get("enUk");

  const [data, setData] = useState<GenerateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [retryToken, setRetryToken] = useState(0);
  const requestRef = useRef<{
    key: string;
    promise: Promise<GenerateResponse>;
  } | null>(null);

  useEffect(() => {
    if (!isLoading) return;
    setLoadingStep(0);
    const timers = LOADING_STEPS.map((step, index) =>
      setTimeout(() => setLoadingStep(index), step.afterMs)
    );
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [isLoading]);

  useEffect(() => {
    if (!level || !topic || !subtopic) {
      setError("Некоректні параметри вправи. Оберіть тему в бібліотеці.");
      setIsLoading(false);
      return;
    }

    const requestBody = JSON.stringify({
      level,
      topic,
      subtopic,
      ukEnCount: parseCount(ukEn),
      enUkCount: parseCount(enUk),
    });

    // React Strict Mode runs effects twice in development. The request is
    // started once per key and shared between both runs, otherwise every visit
    // would create two identical exercises.
    const requestKey = `${requestBody}|${retryToken}`;
    if (requestRef.current?.key !== requestKey) {
      requestRef.current = {
        key: requestKey,
        promise: fetch("/api/exercise/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        }).then((response) => {
          if (!response.ok) {
            throw new Error(`Generate failed with status ${response.status}`);
          }
          return response.json() as Promise<GenerateResponse>;
        }),
      };
    }
    const request = requestRef.current.promise;

    let cancelled = false;

    async function generateExercise() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await request;
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) {
          setError("Не вдалося згенерувати вправу. Спробуйте ще раз.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    generateExercise();

    return () => {
      cancelled = true;
    };
  }, [level, topic, subtopic, ukEn, enUk, retryToken]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Виконання вправи
        </h1>
        {topic && subtopic ? (
          <p className="text-sm text-muted-foreground">
            Тема: {topic} → {subtopic}
          </p>
        ) : null}
      </div>

      {isLoading ? <LoadingBlock step={loadingStep} /> : null}

      {error ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
          {level && topic && subtopic ? (
            <Button
              variant="outline"
              onClick={() => setRetryToken((token) => token + 1)}
            >
              Спробувати ще раз
            </Button>
          ) : null}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          {data.isFallback ? (
            <div className="flex items-start gap-2 rounded-xl border border-accent bg-accent/40 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                AI тимчасово недоступний — показано приклади з шаблону.
                Кількість і напрямки речень можуть відрізнятися від обраних
                налаштувань.
              </p>
            </div>
          ) : null}
          <ExerciseForm
            exerciseId={data.exerciseId}
            sentences={data.sentences}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function ExerciseAppPage() {
  return (
    <Suspense fallback={<LoadingBlock step={0} />}>
      <ExerciseAppContent />
    </Suspense>
  );
}
