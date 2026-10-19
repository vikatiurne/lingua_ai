"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

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
  { afterMs: 0, text: "Аналізуємо ваші помилки..." },
  { afterMs: 3000, text: "Підбираємо граматичні шаблони..." },
  { afterMs: 6000, text: "Генеруємо унікальні речення..." },
  { afterMs: 12000, text: "Перевіряємо переклад..." },
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

    let cancelled = false;

    async function generateExercise() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/exercise/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });
        if (!response.ok) {
          throw new Error(`Generate failed with status ${response.status}`);
        }
        const result = (await response.json()) as GenerateResponse;
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
        <ExerciseForm exerciseId={data.exerciseId} sentences={data.sentences} />
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
