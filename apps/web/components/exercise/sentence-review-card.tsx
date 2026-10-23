"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Lightbulb, XCircle } from "lucide-react";
import { normalizeAnswerText } from "@/lib/exercise/answer-match";
import { isFallbackReference } from "@/lib/exercise/fallback";
import { cn } from "@/lib/utils";

export type VocabularyWord = {
  word: string;
  translation: string;
};

export type Sentence = {
  id: string;
  source: string;
  direction: "uk_en" | "en_uk";
  reference: string;
  // A review row can be reset (new sentences, no answer yet), so the answer
  // is not guaranteed to be present in stored JSON.
  userAnswer?: string;
  isCorrect: boolean;
  errorType?: string;
  explanation?: string;
  vocabularyToAdd?: VocabularyWord[] | VocabularyWord;
};

type SentenceReviewCardProps = {
  sentence: Sentence;
  number: number;
};

function toVocabularyWords(
  value: Sentence["vocabularyToAdd"]
): VocabularyWord[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function SentenceReviewCard({
  sentence,
  number,
}: SentenceReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCorrect = sentence.isCorrect;
  const vocabWords = toVocabularyWords(sentence.vocabularyToAdd);
  const reference = sentence.reference?.trim() ? sentence.reference : "";
  const fallbackReference = isFallbackReference(reference);
  const hasReference = reference.length > 0 && !fallbackReference;
  const explanation = sentence.explanation?.trim() ? sentence.explanation : "";
  const canExpand =
    !isCorrect && Boolean(explanation || vocabWords.length > 0);

  // Punctuation, case and spacing are not a different translation: only real
  // wording differences deserve the "acceptable variant" note.
  const differsFromReference =
    hasReference &&
    normalizeAnswerText(sentence.userAnswer ?? "") !==
      normalizeAnswerText(reference);

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
        <span className="mt-0.5 w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-muted-foreground">
          {number}.
        </span>

        {isCorrect ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        )}

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium">{sentence.source}</p>
          {isCorrect ? (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                {differsFromReference ? (
                  <span className="inline-flex shrink-0 items-center text-xs font-medium text-success">
                    Ваш варіант допустимий:
                  </span>
                ) : null}
                <p className="text-sm text-muted-foreground/90">
                  {sentence.userAnswer || (hasReference ? reference : "")}
                </p>
              </div>
              {differsFromReference ? (
                <p className="text-xs text-muted-foreground">
                  Еталон: {reference}
                </p>
              ) : null}
              {fallbackReference ? (
                <p className="text-xs text-muted-foreground">{reference}</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-destructive">
                Ваша відповідь: {sentence.userAnswer || "..."}
              </p>
              {hasReference ? (
                <p className="text-sm font-semibold text-success">
                  Правильно: {reference}
                </p>
              ) : null}
              {fallbackReference ? (
                <p className="text-xs text-muted-foreground">{reference}</p>
              ) : null}
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
          {explanation && (
            <div className="flex items-start gap-2 rounded-md bg-accent/30 p-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {explanation}
              </p>
            </div>
          )}
          {vocabWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {vocabWords.map((vocab, idx) => (
                <span
                  key={`${vocab.word}-${idx}`}
                  className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium"
                >
                  Word: {vocab.word}
                  {vocab.translation ? ` — ${vocab.translation}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
