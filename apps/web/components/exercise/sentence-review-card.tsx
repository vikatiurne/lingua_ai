"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Lightbulb, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type VocabularyToAdd = {
  word: string;
  translation: string;
} | null | undefined;

export type Sentence = {
  id: string;
  source: string;
  direction: "uk_en" | "en_uk";
  reference: string;
  userAnswer: string;
  isCorrect: boolean;
  errorType?: string;
  explanation?: string;
  vocabularyToAdd?: { word: string; translation: string };
};

type SentenceReviewCardProps = {
  sentence: Sentence;
};

export function SentenceReviewCard({ sentence }: SentenceReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCorrect = sentence.isCorrect;
  const vocab = sentence.vocabularyToAdd as VocabularyToAdd;
  const canExpand = !isCorrect && Boolean(sentence.explanation || vocab);

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        isCorrect
          ? "border-success/30 bg-success/10"
          : "border-destructive/30 bg-destructive/10",
        canExpand && "cursor-pointer hover:border-primary/40",
      )}
    >
      <button
        type="button"
        onClick={() => canExpand && setIsExpanded((prev) => !prev)}
        aria-expanded={canExpand ? isExpanded : undefined}
        disabled={!canExpand}
        className={cn(
          "flex w-full items-start gap-3 p-3 text-left",
          canExpand && "cursor-pointer",
        )}
      >
        {isCorrect ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        )}

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium">{sentence.source}</p>
          {isCorrect ? (
            <p className="text-sm text-muted-foreground/90">
              {sentence.reference}
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-destructive">
                Ваша відповідь: {sentence.userAnswer || "..."}
              </p>
              <p className="text-sm font-semibold text-success">
                Правильно: {sentence.reference}
              </p>
            </>
          )}
        </div>

        {canExpand && (
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2 px-3 pb-3">
          {sentence.explanation && (
            <div className="flex items-start gap-2 rounded-md bg-accent/30 p-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed">{sentence.explanation}</p>
            </div>
          )}
          {vocab && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
              Word: {vocab.word} — {vocab.translation}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
