"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type ReviewButtonProps = {
  exerciseId: string;
  hasMistakes: boolean;
};

export function ReviewButton({ exerciseId, hasMistakes }: ReviewButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (isSubmitting || !hasMistakes) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/exercise/${exerciseId}/review`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Review failed with status ${response.status}`);
      }
      const data = (await response.json()) as { newId: string };
      router.push(`/exercise/${data.newId}${window.location.search}`);
    } catch {
      setError("Не вдалося створити вправу над помилками. Спробуйте ще раз.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-end gap-1 sm:w-auto">
      <Button
        size="sm"
        className="w-full sm:w-auto"
        disabled={!hasMistakes || isSubmitting}
        onClick={handleClick}
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {isSubmitting
          ? "Creating..."
          : hasMistakes
            ? "Work on Mistakes"
            : "No mistakes to review"}
      </Button>
      {error ? (
        <span className="flex items-center gap-1 text-xs font-medium text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </span>
      ) : null}
    </div>
  );
}
