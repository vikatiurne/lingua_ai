"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText, Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadExercisePdf } from "@/lib/exercise/pdf-download";

type PdfState = "idle" | "loading" | "error";

export function ExerciseModeMenu({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const [pdfState, setPdfState] = useState<PdfState>("idle");
  const [pdfError, setPdfError] = useState<string | null>(null);

  const isPreparingPdf = pdfState === "loading";

  function handleAppMode() {
    router.push(`/exercise/${exerciseId}?from=history`);
  }

  async function handlePdfMode() {
    setPdfState("loading");
    setPdfError(null);

    try {
      await downloadExercisePdf(exerciseId);
      router.push(`/exercise/${exerciseId}/pdf-check`);
    } catch {
      setPdfState("error");
      setPdfError("Не вдалося підготувати PDF. Спробуйте ще раз.");
    }
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Продовжити"
              className="shrink-0 text-primary hover:bg-accent/60 hover:text-primary"
            >
              {isPreparingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Продовжити</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-56 shadow-lg">
        <DropdownMenuItem onSelect={handleAppMode}>
          <Play />
          Виконати в додатку
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isPreparingPdf}
          onSelect={(event) => {
            event.preventDefault();
            void handlePdfMode();
          }}
        >
          {isPreparingPdf ? (
            <Loader2 className="animate-spin" />
          ) : (
            <FileText />
          )}
          Роздрукувати PDF
        </DropdownMenuItem>

        {pdfError ? (
          <div className="flex items-start gap-2 px-2 py-1.5 text-xs font-medium text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{pdfError}</span>
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
