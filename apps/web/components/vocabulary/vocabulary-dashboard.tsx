"use client";

import Link from "next/link";
import { Info, Layers, MoreHorizontal, MoreVertical, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VocabularyWord } from "@/lib/exercise/vocabulary";
import { formatWordCount } from "@/lib/vocabulary/format";
import { cn } from "@/lib/utils";

export type VocabularyGroupView = {
  date: string;
  label: string;
  flashcardsCount: number;
  flashcardsWords: VocabularyWord[];
  spellingCount: number;
  spellingWords: VocabularyWord[];
};

type VocabularyDashboardProps = {
  unlearned: VocabularyGroupView[];
  learned: VocabularyGroupView[];
};

export function VocabularyDashboard({
  unlearned,
  learned,
}: VocabularyDashboardProps) {
  return (
    <Tabs defaultValue="unlearned">
      <TabsList>
        <TabsTrigger value="unlearned">Невивчені ({unlearned.length})</TabsTrigger>
        <TabsTrigger value="learned">Вивчені ({learned.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="unlearned">
        <GroupGrid groups={unlearned} />
      </TabsContent>
      <TabsContent value="learned">
        <GroupGrid groups={learned} />
      </TabsContent>
    </Tabs>
  );
}

function GroupGrid({ groups }: { groups: VocabularyGroupView[] }) {
  if (groups.length === 0) {
    return (
      <Card>
        <div className="flex flex-col gap-1 p-6">
          <p className="font-display text-lg font-semibold tracking-tight">
            Слів поки немає
          </p>
          <p className="text-sm text-muted-foreground">
            Збережіть слова з вправи — і вони з&apos;являться тут, згруповані за
            датою.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 grid-auto-rows-fr md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {groups.map((group) => (
        <DateCard key={group.date} group={group} />
      ))}
    </div>
  );
}

function DateCard({ group }: { group: VocabularyGroupView }) {
  const totalCount = group.flashcardsCount + group.spellingCount;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 p-3 sm:p-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate font-display text-sm font-semibold sm:text-base">
            {group.label}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {formatWordCount(totalCount)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Дії зі словами"
              className="shrink-0 text-primary hover:bg-accent/60 hover:text-primary"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {group.flashcardsCount > 0 ? (
              <DropdownMenuItem asChild>
                <Link href={`/vocabulary/flashcards?date=${group.date}`}>
                  <Layers />
                  Картки
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>
                <Layers />
                Картки
              </DropdownMenuItem>
            )}

            {group.spellingCount > 0 ? (
              <DropdownMenuItem asChild>
                <Link href={`/vocabulary/spelling?date=${group.date}`}>
                  <PenLine />
                  Написання
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>
                <PenLine />
                Написання
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardFooter className="mt-auto flex-col items-stretch gap-1.5 border-t border-border/60 px-3 py-2 sm:px-4">
        <StatRow
          label="Для карток"
          count={group.flashcardsCount}
          words={group.flashcardsWords}
        />
        <StatRow
          label="Для написання"
          count={group.spellingCount}
          words={group.spellingWords}
        />
      </CardFooter>
    </Card>
  );
}

function StatRow({
  label,
  count,
  words,
}: {
  label: string;
  count: number;
  words: VocabularyWord[];
}) {
  const isEmpty = count === 0;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs",
        isEmpty && "text-muted-foreground/60"
      )}
    >
      <span>
        {label}:{" "}
        <span className="font-semibold tracking-tight">
          {formatWordCount(count)}
        </span>
      </span>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Слова: ${label}`}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <p className="mb-2 text-xs font-semibold text-foreground">{label}</p>
          {words.length === 0 ? (
            <p className="text-xs text-muted-foreground">Слів немає</p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
              {words.map((word) => (
                <li key={word.word}>
                  <span className="font-medium text-foreground">
                    {word.word}
                  </span>
                  <span className="text-muted-foreground">
                    {" — "}
                    {word.translation}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
