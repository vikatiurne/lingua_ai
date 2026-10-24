"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { AudioButton } from "@/components/shared/audio-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type ExerciseAppSentence = {
  id: string;
  source: string;
  direction: "uk_en" | "en_uk";
  reference: string;
  userAnswer?: string;
};

type UserAnswers = Record<string, string>;

export type SubmitPayload = {
  exerciseId: string;
  answers: {
    sentenceId: string;
    userAnswer: string;
  }[];
};

const DIRECTION_LABELS: Record<ExerciseAppSentence["direction"], string> = {
  uk_en: "UA/EN",
  en_uk: "EN/UA",
};

async function getResponseError(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string" &&
      data.error.trim().length > 0
    ) {
      return data.error;
    }
  } catch {
    // Fall back to a generic message when the body is not JSON.
  }
  return fallback;
}

export function ExerciseForm({
  exerciseId,
  sentences,
}: {
  exerciseId: string;
  sentences: ExerciseAppSentence[];
}) {
  const router = useRouter();
  const draftKey = `exercise_${exerciseId}_draft`;
  const [answers, setAnswers] = useState<UserAnswers>(() =>
    Object.fromEntries(
      sentences.map((sentence) => [sentence.id, sentence.userAnswer ?? ""])
    )
  );
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sentenceIds = new Set(sentences.map((sentence) => sentence.id));
    const restored: UserAnswers = {};

    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          for (const [sentenceId, value] of Object.entries(parsed)) {
            if (sentenceIds.has(sentenceId) && typeof value === "string") {
              restored[sentenceId] = value;
            }
          }
        }
      }
    } catch {
      // A broken draft must not block the form.
    }

    if (Object.keys(restored).length > 0) {
      setAnswers((prev) => ({ ...prev, ...restored }));
    }
    setDraftLoaded(true);
  }, [draftKey, sentences]);

  useEffect(() => {
    if (!draftLoaded) return;

    try {
      window.localStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {
      // Storage may be unavailable (private mode); the form still works.
    }
  }, [answers, draftKey, draftLoaded]);

  const allFilled = sentences.every(
    (sentence) => (answers[sentence.id] ?? "").trim().length > 0
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allFilled || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const payload: SubmitPayload = {
        exerciseId,
        answers: sentences.map((sentence) => ({
          sentenceId: sentence.id,
          userAnswer: (answers[sentence.id] ?? "").trim(),
        })),
      };

      const answersResponse = await fetch(`/api/exercise/${exerciseId}/answers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload.answers }),
      });
      if (!answersResponse.ok) {
        throw new Error(
          await getResponseError(
            answersResponse,
            "Не вдалося зберегти відповіді. Спробуйте ще раз."
          )
        );
      }

      const evaluateResponse = await fetch(`/api/exercise/${exerciseId}/evaluate`, {
        method: "POST",
      });
      if (!evaluateResponse.ok) {
        throw new Error(
          await getResponseError(
            evaluateResponse,
            "Не вдалося перевірити відповіді. Спробуйте ще раз."
          )
        );
      }

      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        // Ignore storage failures after a successful evaluation.
      }

      router.replace(`/exercise/${exerciseId}/result${window.location.search}`);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "";
      const isNetworkError = /failed to fetch|load failed|networkerror/i.test(
        message
      );
      setError(
        message && !isNetworkError
          ? message
          : "Не вдалося перевірити відповіді. Спробуйте ще раз."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Ваші переклади
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Якщо не знаєте переклад слова, поставте{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">
              ...
            </code>
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {sentences.map((sentence, index) => (
            <div key={sentence.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <p className="min-w-0 break-words leading-relaxed">
                    <span className="mr-2 font-medium text-muted-foreground">
                      {index + 1}.
                    </span>
                    {sentence.source}
                  </p>
                  {sentence.direction === "en_uk" ? (
                    <AudioButton text={sentence.source} lang="en-US" />
                  ) : null}
                </div>
                <Badge
                  variant="secondary"
                  className="shrink-0 border-primary/30 bg-primary/10 text-primary"
                >
                  {DIRECTION_LABELS[sentence.direction]}
                </Badge>
              </div>
              <Input
                id={sentence.id}
                value={answers[sentence.id] ?? ""}
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [sentence.id]: event.target.value,
                  }))
                }
                placeholder="Ваш переклад"
                aria-label={`Переклад речення ${index + 1}`}
                autoComplete="off"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={!allFilled || isSubmitting}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Перевіряємо...
          </>
        ) : (
          "Перевірити"
        )}
      </Button>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </form>
  );
}
