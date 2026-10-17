"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

import type { TestQuestion } from "@/lib/test/loader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function QuestionCard({
  question,
  onAnswer,
}: {
  question: TestQuestion;
  onAnswer: (correct: boolean, skipped: boolean) => void;
}) {
  const [answered, setAnswered] = useState(false);

  function handleSelect(index: number) {
    if (answered) return;
    setAnswered(true);
    onAnswer(index === question.correctIndex, false);
  }

  function handleSkip() {
    if (answered) return;
    setAnswered(true);
    onAnswer(false, true);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-lg font-semibold tracking-tight sm:text-xl">
          {question.question}
        </h2>
      </div>
      <div className="grid gap-3">
        {question.options.map((option, index) => (
          <button
            key={`${question.id}-${index}`}
            type="button"
            disabled={answered}
            onClick={() => handleSelect(index)}
            className="w-full rounded-lg border border-border bg-card p-4 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
          >
            {option}
          </button>
        ))}
      </div>
      <div className="flex justify-center">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={answered}
                onClick={handleSkip}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                <HelpCircle className="h-4 w-4" />
                Не знаю
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Зараховується як неправильна відповідь і пропускає це питання.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
