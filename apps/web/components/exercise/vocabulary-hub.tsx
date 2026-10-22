"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  BookOpen,
  Loader2,
  PenLine,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type WordEntry = {
  word: string;
  translation: string;
};

type Column = "spelling" | "vocabulary";

type VocabularyHubProps = {
  exerciseId: string;
  initialSpelling: WordEntry[];
  initialVocabulary: WordEntry[];
  fromHistory: boolean;
};

const EMPTY_MESSAGE = "Помилок немає. Чудова робота!";

type Snapshot = {
  spelling: WordEntry[];
  vocabulary: WordEntry[];
};

async function patchWord(
  exerciseId: string,
  payload: {
    word: string;
    action: "delete" | "restore" | "move";
    to?: Column;
  }
): Promise<void> {
  const response = await fetch(`/api/exercise/${exerciseId}/vocabulary/update`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Update failed with status ${response.status}`);
  }
}

export function VocabularyHub({
  exerciseId,
  initialSpelling,
  initialVocabulary,
  fromHistory,
}: VocabularyHubProps) {
  const router = useRouter();
  const [spelling, setSpelling] = useState<WordEntry[]>(initialSpelling);
  const [vocabulary, setVocabulary] = useState<WordEntry[]>(initialVocabulary);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);

  const captureSnapshot = useCallback((): Snapshot => {
    snapshotRef.current = { spelling, vocabulary };
    return snapshotRef.current;
  }, [spelling, vocabulary]);

  const restoreSnapshot = useCallback((): void => {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    setSpelling(snapshot.spelling);
    setVocabulary(snapshot.vocabulary);
    snapshotRef.current = null;
  }, []);

  function removeWord(category: Column, word: string): void {
    captureSnapshot();
    if (category === "spelling") {
      setSpelling((prev) => prev.filter((entry) => entry.word !== word));
    } else {
      setVocabulary((prev) => prev.filter((entry) => entry.word !== word));
    }

    void patchWord(exerciseId, { word, action: "delete" })
      .then(() => {
        toast.info(`Слово «${word}» прибрано`, {
          action: {
            label: "Скасувати",
            onClick: () => {
              void patchWord(exerciseId, { word, action: "restore" })
                .then(() => {
                  const snapshot = snapshotRef.current;
                  if (snapshot) {
                    setSpelling(snapshot.spelling);
                    setVocabulary(snapshot.vocabulary);
                    snapshotRef.current = null;
                  }
                  toast.success(`Слово «${word}» повернено`);
                })
                .catch(() => {
                  toast.error("Не вдалося повернути слово. Спробуйте ще раз.");
                });
            },
          },
        });
      })
      .catch(() => {
        restoreSnapshot();
        toast.error("Не вдалося видалити слово. Спробуйте ще раз.");
      });
  }

  function moveWord(from: Column, word: string): void {
    const source = from === "spelling" ? spelling : vocabulary;
    const entry = source.find((item) => item.word === word);
    if (!entry) return;

    const to: Column = from === "spelling" ? "vocabulary" : "spelling";
    captureSnapshot();

    if (from === "spelling") {
      setSpelling((prev) => prev.filter((item) => item.word !== word));
      setVocabulary((prev) => [...prev, entry]);
    } else {
      setVocabulary((prev) => prev.filter((item) => item.word !== word));
      setSpelling((prev) => [...prev, entry]);
    }

    void patchWord(exerciseId, { word, action: "move", to }).catch(() => {
      restoreSnapshot();
      toast.error("Не вдалося перенести слово. Спробуйте ще раз.");
    });
  }

  async function handleSave(): Promise<void> {
    if (isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/exercise/${exerciseId}/vocabulary/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spelling, vocabulary }),
        }
      );
      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }
      toast.success("Слова збережено у ваш словник!");
      router.push(fromHistory ? "/exercises" : "/plan");
    } catch {
      setError("Не вдалося зберегти слова. Спробуйте ще раз.");
      setIsSaving(false);
    }
  }

  return (
    <div className="ml-0 flex w-full max-w-6xl flex-col gap-4 px-4 py-4 text-left md:px-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      <div className="space-y-1 text-left">
        <h1 className="text-xl font-semibold tracking-tight">Review Words</h1>
        <p className="text-sm text-muted-foreground">
          Приберіть зайві слова та збережіть решту для тренажерів.
        </p>
      </div>

      {/* Mobile: tabs */}
      <Tabs defaultValue="spelling" className="md:hidden">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="spelling" className="gap-1.5">
            <PenLine className="h-3.5 w-3.5" />
            Spelling ({spelling.length})
          </TabsTrigger>
          <TabsTrigger value="vocabulary" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Vocabulary ({vocabulary.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="spelling">
          <WordColumn
            title="Spelling"
            icon={<PenLine className="h-4 w-4" />}
            items={spelling}
            onRemove={(word) => removeWord("spelling", word)}
            onMove={(word) => moveWord("spelling", word)}
            moveLabel="Перенести в Vocabulary"
          />
        </TabsContent>
        <TabsContent value="vocabulary">
          <WordColumn
            title="Vocabulary"
            icon={<BookOpen className="h-4 w-4" />}
            items={vocabulary}
            onRemove={(word) => removeWord("vocabulary", word)}
            onMove={(word) => moveWord("vocabulary", word)}
            moveLabel="Перенести в Spelling"
          />
        </TabsContent>
      </Tabs>

      {/* Desktop: two columns */}
      <div className="hidden gap-4 md:grid md:grid-cols-2">
        <WordColumn
          title="Spelling"
          icon={<PenLine className="h-4 w-4" />}
          items={spelling}
          onRemove={(word) => removeWord("spelling", word)}
          onMove={(word) => moveWord("spelling", word)}
          moveLabel="Перенести в Vocabulary"
        />
        <WordColumn
          title="Vocabulary"
          icon={<BookOpen className="h-4 w-4" />}
          items={vocabulary}
          onRemove={(word) => removeWord("vocabulary", word)}
          onMove={(word) => moveWord("vocabulary", word)}
          moveLabel="Перенести в Spelling"
        />
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <Button
        size="lg"
        className="w-full"
        disabled={isSaving}
        onClick={handleSave}
      >
        {isSaving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {isSaving ? "Saving..." : "Save to Training"}
      </Button>
    </div>
  );
}

function WordColumn({
  title,
  icon,
  items,
  onRemove,
  onMove,
  moveLabel,
}: {
  title: string;
  icon: ReactNode;
  items: WordEntry[];
  onRemove: (word: string) => void;
  onMove: (word: string) => void;
  moveLabel: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card/60 p-4">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg">
        {icon}
        {title}
        <span className="font-sans text-sm font-normal text-muted-foreground">
          ({items.length})
        </span>
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{EMPTY_MESSAGE}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((entry) => (
            <li
              key={entry.word}
              className="flex items-center justify-between gap-2 rounded-md bg-secondary/50 px-3 py-2"
            >
              <span className="text-sm">
                <span className="font-medium">{entry.word}</span>
                {entry.translation ? (
                  <span className="text-muted-foreground">
                    {" — "}
                    {entry.translation}
                  </span>
                ) : null}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`${moveLabel}: ${entry.word}`}
                  title={moveLabel}
                  onClick={() => onMove(entry.word)}
                  className={cn(
                    "rounded-md p-1.5 text-muted-foreground transition-colors",
                    "hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${entry.word}`}
                  onClick={() => onRemove(entry.word)}
                  className={cn(
                    "rounded-md p-1.5 text-muted-foreground transition-colors",
                    "hover:bg-destructive/10 hover:text-destructive"
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
