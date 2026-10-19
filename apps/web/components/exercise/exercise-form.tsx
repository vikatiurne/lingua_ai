"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type ExerciseAppSentence = {
  id: string;
  source: string;
  direction: "uk_en" | "en_uk";
  reference: string;
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
  uk_en: "укр → англ",
  en_uk: "англ → укр",
};

export function ExerciseForm({
  exerciseId,
  sentences,
}: {
  exerciseId: string;
  sentences: ExerciseAppSentence[];
}) {
  const [answers, setAnswers] = useState<UserAnswers>({});

  const allFilled = sentences.every(
    (sentence) => (answers[sentence.id] ?? "").trim().length > 0
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allFilled) return;

    const payload: SubmitPayload = {
      exerciseId,
      answers: sentences.map((sentence) => ({
        sentenceId: sentence.id,
        userAnswer: (answers[sentence.id] ?? "").trim(),
      })),
    };
    console.log(payload);
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
                <p className="min-w-0 break-words leading-relaxed">
                  <span className="mr-2 font-medium text-muted-foreground">
                    {index + 1}.
                  </span>
                  {sentence.source}
                </p>
                <Badge variant="secondary" className="shrink-0">
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

      <Button type="submit" disabled={!allFilled} className="w-full sm:w-auto">
        Перевірити
      </Button>
    </form>
  );
}
