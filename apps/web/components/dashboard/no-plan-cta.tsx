"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function NoPlanCTA() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleGenerate() {
    setIsSubmitting(true);
    setError(false);
    try {
      const response = await fetch("/api/plan/generate", { method: "POST" });
      if (!response.ok) {
        setError(true);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-xl text-center">
      <CardHeader className="space-y-2">
        <CardTitle className="font-display text-2xl font-semibold tracking-tight">
          Створіть план навчання
        </CardTitle>
        <CardDescription className="text-base">
          Згенеруємо персональний план на основі вашого рівня та слабких тем
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Створюємо...
            </>
          ) : (
            "Створити план"
          )}
        </Button>
        {error ? (
          <p className="text-sm text-destructive">
            Не вдалось створити план. Спробуйте ще раз.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
