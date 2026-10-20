"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import type {
  ExerciseAppSentence,
  SubmitPayload,
} from "@/components/exercise/exercise-form";
import { pluralize } from "@/lib/i18n/plural";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DIRECTION_LABELS: Record<ExerciseAppSentence["direction"], string> = {
  uk_en: "UA/EN",
  en_uk: "EN/UA",
};

const DIRECTION_BADGE_CLASSES =
  "shrink-0 border-primary/30 bg-primary/10 text-primary";

type PdfCheckEntry = {
  answer: string;
  confirmed: boolean;
};

type PdfCheckState = Record<string, PdfCheckEntry>;

function createInitialState(sentences: ExerciseAppSentence[]): PdfCheckState {
  return Object.fromEntries(
    sentences.map((sentence) => [
      sentence.id,
      { answer: sentence.reference, confirmed: false },
    ]),
  );
}

export function PdfCheckForm({
  exerciseId,
  sentences,
}: {
  exerciseId: string;
  sentences: ExerciseAppSentence[];
}) {
  const router = useRouter();
  const [state, setState] = useState<PdfCheckState>(() =>
    createInitialState(sentences),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [unmodifiedCount, setUnmodifiedCount] = useState(0);

  function updateEntry(sentenceId: string, patch: Partial<PdfCheckEntry>) {
    setState((prev) => {
      const current = prev[sentenceId];
      if (!current) return prev;
      return { ...prev, [sentenceId]: { ...current, ...patch } };
    });
  }

  function countUnmodified(): number {
    return sentences.filter((sentence) => {
      const entry = state[sentence.id];
      if (!entry || entry.confirmed) return false;
      return entry.answer.trim() === sentence.reference.trim();
    }).length;
  }

  async function performSubmit() {
    setError(null);
    setIsSubmitting(true);
    setShowConfirm(false);

    try {
      const payload: SubmitPayload = {
        exerciseId,
        answers: sentences.map((sentence) => {
          const entry = state[sentence.id];
          return {
            sentenceId: sentence.id,
            userAnswer:
              entry && entry.confirmed
                ? sentence.reference
                : (entry?.answer ?? sentence.reference).trim(),
          };
        }),
      };

      const answersResponse = await fetch(
        `/api/exercise/${exerciseId}/answers`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: payload.answers }),
        },
      );
      if (!answersResponse.ok) {
        throw new Error(
          `Save answers failed with status ${answersResponse.status}`,
        );
      }

      const evaluateResponse = await fetch(
        `/api/exercise/${exerciseId}/evaluate`,
        {
          method: "POST",
        },
      );
      if (!evaluateResponse.ok) {
        throw new Error(
          `Evaluate failed with status ${evaluateResponse.status}`,
        );
      }

      router.push(`/exercise/${exerciseId}/result`);
    } catch {
      setError("Не вдалося перевірити відповіді. Спробуйте ще раз.");
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const unmodified = countUnmodified();
    if (unmodified > 0) {
      setUnmodifiedCount(unmodified);
      setShowConfirm(true);
      return;
    }

    performSubmit();
  }

  const unmodifiedLabel = `${unmodifiedCount} ${pluralize(
    unmodifiedCount,
    "відповідь",
    "відповіді",
    "відповідей",
  )}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Ваші переклади з паперу
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Поле містить еталонну відповідь AI. Якщо написали правильно —
            поставте прапорець (поле повернеться до еталона і заблокується).
            Якщо зробили помилку — зніміть прапорець і впишіть свій
            неправильний варіант. Якщо не знаєте переклад слова — поставте{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">
              ...
            </code>
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <TooltipProvider delayDuration={150}>
            {sentences.map((sentence, index) => {
              const entry = state[sentence.id] ?? {
                answer: sentence.reference,
                confirmed: false,
              };

              return (
                <div key={sentence.id} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words text-sm leading-relaxed">
                      <span className="mr-2 font-medium text-muted-foreground">
                        {index + 1}.
                      </span>
                      {sentence.source}
                    </p>
                    <Badge
                      variant="secondary"
                      className={DIRECTION_BADGE_CLASSES}
                    >
                      {DIRECTION_LABELS[sentence.direction]}
                    </Badge>
                  </div>

                  <Label
                    htmlFor={`pdf-answer-${sentence.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    Відповідь
                  </Label>

                  <div className="flex items-start gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Checkbox
                          id={`pdf-confirm-${sentence.id}`}
                          checked={entry.confirmed}
                          onCheckedChange={(checked) =>
                            updateEntry(
                              sentence.id,
                              checked === true
                                ? {
                                    confirmed: true,
                                    answer: sentence.reference,
                                  }
                                : { confirmed: false }
                            )
                          }
                          aria-label="Написав правильно"
                          className="mt-2"
                        />
                      </TooltipTrigger>
                      <TooltipContent>Написав правильно</TooltipContent>
                    </Tooltip>

                    <Textarea
                      id={`pdf-answer-${sentence.id}`}
                      value={entry.answer}
                      onChange={(event) =>
                        updateEntry(sentence.id, { answer: event.target.value })
                      }
                      disabled={entry.confirmed}
                      placeholder="Те, що ви написали від руки"
                      autoComplete="off"
                      className="min-h-[40px] resize-none overflow-hidden text-sm [field-sizing:content]"
                    />
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        </CardContent>
      </Card>
      <Button
        type="submit"
        disabled={isSubmitting}
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

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перевірити без правок?</DialogTitle>
            <br />
            <DialogDescription>
              Ви не відредагували {unmodifiedLabel}. Якщо ваші відповіді
              збігаються з еталонними, вони автоматично зарахуються як
              правильні.
              <br />
              <br />
              Якщо ваші відповіді відрізняються — відредагуйте їх (впишіть
              свій варіант).
              <br />
              <br />
              Продовжити?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirm(false)}
            >
              Ні, повернутись
            </Button>
            <Button type="button" onClick={performSubmit}>
              Так, перевірити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </form>
  );
}
