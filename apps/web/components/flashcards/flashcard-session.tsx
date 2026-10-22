"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, PartyPopper, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VocabularyWord } from "@/lib/exercise/vocabulary";

type FlashcardSessionProps = {
  words: VocabularyWord[];
  onComplete?: () => void;
};

export function FlashcardSession({ words, onComplete }: FlashcardSessionProps) {
  const [queue, setQueue] = useState<VocabularyWord[]>(words);
  const [isFlipped, setIsFlipped] = useState(false);
  const isCompletedRef = useRef(false);

  const current = queue[0];
  const remaining = queue.length;
  const total = words.length;
  const learned = total - remaining;
  const progressPercent = total === 0 ? 0 : Math.round((learned / total) * 100);

  useEffect(() => {
    if (total === 0 || remaining > 0) return;
    if (isCompletedRef.current) return;

    isCompletedRef.current = true;
    onComplete?.();
  }, [onComplete, remaining, total]);

  function handleFlip() {
    setIsFlipped((flipped) => !flipped);
  }

  function speak() {
    if (!current || typeof window === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(current.word);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  function handleKnow() {
    setIsFlipped(false);
    setQueue((prev) => prev.slice(1));
  }

  function handleDontKnow() {
    setIsFlipped(false);
    setQueue((prev) => {
      const [first, ...rest] = prev;
      if (!first) return prev;
      return [...rest, first];
    });
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-success/40 bg-success/10 px-4 py-12 text-center">
        <PartyPopper className="h-8 w-8 text-success" />
        <p className="font-display text-xl font-semibold">
          Вітаємо! Ви вивчили всі слова
        </p>
        <Button asChild>
          <Link href="/plan">
            Назад до плану
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Залишилось: {remaining} з {total}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div
        className="perspective-1000 h-64 w-full cursor-pointer select-none"
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleFlip();
          }
        }}
        aria-label="Перевернути картку"
      >
        <div
          className={cn(
            "relative h-full w-full transition-transform duration-500 transform-style-3d",
            isFlipped && "rotate-y-180"
          )}
        >
          <div className="absolute flex h-full w-full flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-6 backface-hidden">
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              {current.word}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Прослухати вимову"
              onClick={(event) => {
                event.stopPropagation();
                speak();
              }}
            >
              <Volume2 className="h-5 w-5" />
            </Button>
          </div>
          <div className="absolute flex h-full w-full items-center justify-center rounded-xl border border-primary bg-primary p-6 text-primary-foreground backface-hidden rotate-y-180">
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              {current.translation}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" variant="outline" onClick={handleDontKnow}>
          Не знаю
        </Button>
        <Button size="lg" onClick={handleKnow}>
          Знаю
        </Button>
      </div>
    </div>
  );
}
