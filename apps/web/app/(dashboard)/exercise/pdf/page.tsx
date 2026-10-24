"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  clearGenerationId,
  getBrowserGenerationStorage,
  getOrCreateGenerationId,
} from "@/lib/exercise/generation-key";

type GenerateResponse = {
  exerciseId: string;
};

type Phase = "idle" | "generating" | "printing";

const COUNT_MIN = 0;
const COUNT_MAX = 20;
const COUNT_DEFAULT = 5;

const PRINT_WAIT_SECONDS = 120;

const LOADING_STEPS = [
  { afterMs: 0, text: "Генеруємо унікальні речення..." },
  { afterMs: 3000, text: "Підбираємо граматичні шаблони..." },
  { afterMs: 6000, text: "Готуємо PDF для друку..." },
  { afterMs: 12000, text: "Завантажуємо файл..." },
] as const;

function parseCount(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return COUNT_DEFAULT;
  return Math.min(COUNT_MAX, Math.max(COUNT_MIN, parsed));
}

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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

function ExercisePdfContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const level = searchParams.get("level");
  const topic = searchParams.get("topic");
  const subtopic = searchParams.get("subtopic");
  const ukEn = searchParams.get("ukEn");
  const enUk = searchParams.get("enUk");

  const [phase, setPhase] = useState<Phase>("generating");
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(PRINT_WAIT_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [retryToken, setRetryToken] = useState(0);
  const requestRef = useRef<{
    key: string;
    promise: Promise<GenerateResponse>;
  } | null>(null);

  const isLoading = phase === "generating";

  useEffect(() => {
    if (!isLoading) return;
    setLoadingStep(0);
    const timers = LOADING_STEPS.map((step, index) =>
      setTimeout(() => setLoadingStep(index), step.afterMs)
    );
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [isLoading]);

  useEffect(() => {
    if (phase !== "printing") return;
    const timer = setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (!level || !topic || !subtopic) {
      setError("Некоректні параметри вправи. Оберіть тему в бібліотеці.");
      setPhase("idle");
      return;
    }

    const generationParams = {
      level,
      topic,
      subtopic,
      ukEnCount: parseCount(ukEn),
      enUkCount: parseCount(enUk),
    };
    const paramsKey = JSON.stringify(generationParams);
    const storage = getBrowserGenerationStorage();
    const generationId = getOrCreateGenerationId(
      storage,
      "exercise-pdf",
      paramsKey
    );
    const requestBody = JSON.stringify({
      ...generationParams,
      generationId,
    });

    // Share one request between Strict Mode effect runs; the generation id
    // also lets the server return the same exercise after a page reload.
    const requestKey = `${requestBody}|${retryToken}`;
    if (requestRef.current?.key !== requestKey) {
      requestRef.current = {
        key: requestKey,
        promise: fetch("/api/exercise/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Generate failed with status ${response.status}`);
            }
            return response.json() as Promise<GenerateResponse>;
          })
          .then((data) => {
            clearGenerationId(storage, "exercise-pdf", paramsKey, generationId);
            return data;
          }),
      };
    }
    const request = requestRef.current.promise;

    let cancelled = false;

    async function startPdfMode() {
      setPhase("generating");
      setError(null);
      try {
        const data = await request;
        if (cancelled) return;

        const link = document.createElement("a");
        link.href = `/api/exercise/${data.exerciseId}/pdf`;
        link.click();

        setExerciseId(data.exerciseId);
        setSecondsLeft(PRINT_WAIT_SECONDS);
        setPhase("printing");
      } catch {
        if (!cancelled) {
          setError("Не вдалося підготувати PDF. Спробуйте ще раз.");
          setPhase("idle");
        }
      }
    }

    startPdfMode();

    return () => {
      cancelled = true;
    };
  }, [level, topic, subtopic, ukEn, enUk, retryToken, router]);

  function handleRetry() {
    setError(null);
    setSecondsLeft(PRINT_WAIT_SECONDS);
    setRetryToken((token) => token + 1);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Вправа для друку (PDF)
        </h1>
        {topic && subtopic ? (
          <p className="text-sm text-muted-foreground">
            Тема: {topic} → {subtopic}
          </p>
        ) : null}
      </div>

      {phase === "generating" ? <LoadingBlock step={loadingStep} /> : null}

      {phase === "printing" && exerciseId ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              PDF завантажено
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Роздрукуйте аркуш і заповніть переклади від руки. Якщо не знаєте
              переклад слова — поставте{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                ...
              </code>
              . Коли закінчите — натисніть «Перевірити».
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              disabled={secondsLeft > 0}
              onClick={() => router.push(`/exercise/${exerciseId}/pdf-check`)}
              className="h-auto w-full whitespace-normal py-2 text-left sm:w-auto"
            >
              {secondsLeft > 0
                ? "Ви маєте зараз друкувати та заповнювати лист завдання"
                : "Перевірити"}
            </Button>
            {secondsLeft > 0 ? (
              <p className="text-xs text-muted-foreground">
                Кнопка «Перевірити» стане доступна через{" "}
                {formatSeconds(secondsLeft)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
          {level && topic && subtopic ? (
            <Button variant="outline" onClick={handleRetry}>
              Спробувати ще раз
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ExercisePdfPage() {
  return (
    <Suspense fallback={<LoadingBlock step={0} />}>
      <ExercisePdfContent />
    </Suspense>
  );
}
