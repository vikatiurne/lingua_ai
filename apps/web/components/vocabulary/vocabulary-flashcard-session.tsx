"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";

import { FlashcardSession } from "@/components/flashcards/flashcard-session";
import type { VocabularyWord } from "@/lib/vocabulary/vocabulary";

type VocabularyFlashcardSessionProps = {
  words: VocabularyWord[];
  date: string;
};

export function VocabularyFlashcardSession({
  words,
  date,
}: VocabularyFlashcardSessionProps) {
  const isMarkedRef = useRef(false);

  const handleComplete = useCallback(async () => {
    if (isMarkedRef.current) return;
    isMarkedRef.current = true;

    try {
      const response = await fetch("/api/vocabulary/mark-learned", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          words: words.map((word) => word.word),
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      toast.success("Слова позначено як вивчені");
    } catch {
      toast.error("Не вдалося позначити слова як вивчені");
    }
  }, [date, words]);

  return <FlashcardSession words={words} onComplete={handleComplete} />;
}
