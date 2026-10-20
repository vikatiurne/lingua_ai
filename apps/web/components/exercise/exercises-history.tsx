"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, Play } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type ExerciseHistoryItem = {
  id: string;
  topicName: string;
  subtopicName: string | null;
  status: string;
  topicScore: number | null;
  grammarScore: number | null;
  createdAt: string;
};

const PAGE_SIZE = 16;

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const PERIOD_FILTERS = [
  { key: "all", label: "Весь час", days: null },
  { key: "week", label: "Тиждень", days: 7 },
  { key: "month", label: "Місяць", days: 30 },
  { key: "year", label: "Рік", days: 365 },
] as const;

type PeriodKey = (typeof PERIOD_FILTERS)[number]["key"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", DATE_OPTIONS);
}

function ScoreItem({ label, score }: { label: string; score: number }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-xs text-muted-foreground">{label} </span>
      <span className="text-xs font-semibold tracking-tight">{score}%</span>
    </span>
  );
}

function IconLinkButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="shrink-0 text-primary hover:bg-accent/60 hover:text-primary"
          aria-label={label}
        >
          <Link href={href}>{children}</Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ExerciseCard({ exercise }: { exercise: ExerciseHistoryItem }) {
  const isEvaluated = exercise.status === "evaluated";

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 p-3 sm:p-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate font-display text-sm font-semibold sm:text-base">
            {exercise.topicName}
          </CardTitle>
          {exercise.subtopicName ? (
            <p className="truncate text-sm text-muted-foreground">
              {exercise.subtopicName}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {formatDate(exercise.createdAt)}
          </p>
        </div>
        {isEvaluated ? (
          <IconLinkButton
            href={`/exercise/${exercise.id}/result?from=history`}
            label="Дивитись результат"
          >
            <Info className="h-4 w-4" />
          </IconLinkButton>
        ) : (
          <IconLinkButton
            href={`/exercise/${exercise.id}?from=history`}
            label="Продовжити"
          >
            <Play className="h-4 w-4" />
          </IconLinkButton>
        )}
      </CardHeader>
      {isEvaluated ? (
        <CardFooter className="mt-auto flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-border/60 px-3 py-2 sm:px-4">
          <ScoreItem label="Topic" score={exercise.topicScore ?? 0} />
          <span aria-hidden className="text-border">
            ·
          </span>
          <ScoreItem label="Grammar" score={exercise.grammarScore ?? 0} />
        </CardFooter>
      ) : null}
    </Card>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        size="icon"
        variant="outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Попередня сторінка"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        Сторінка {page} з {totalPages}
      </span>
      <Button
        size="icon"
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Наступна сторінка"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function PeriodFilter({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (value: PeriodKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PERIOD_FILTERS.map((filter) => (
        <Button
          key={filter.key}
          size="sm"
          variant="ghost"
          className={cn(
            "h-8 px-3 text-sm text-muted-foreground",
            value === filter.key &&
              "bg-accent font-medium text-foreground hover:bg-accent hover:text-foreground"
          )}
          onClick={() => onChange(filter.key)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

type TabKey = "in_progress" | "completed";

export function ExercisesHistory({
  exercises,
}: {
  exercises: ExerciseHistoryItem[];
}) {
  const [tab, setTab] = useState<TabKey>("in_progress");
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<PeriodKey>("all");

  const filtered = useMemo(() => {
    const days = PERIOD_FILTERS.find((f) => f.key === period)?.days ?? null;
    const cutoff = days
      ? Date.now() - days * 24 * 60 * 60 * 1000
      : null;

    const byPeriod = exercises.filter(
      (e) => cutoff === null || new Date(e.createdAt).getTime() >= cutoff
    );

    const inProgress = byPeriod.filter((e) => e.status !== "evaluated");
    const completed = byPeriod.filter((e) => e.status === "evaluated");
    return { in_progress: inProgress, completed };
  }, [exercises, period]);

  const current = filtered[tab];
  const totalPages = Math.max(1, Math.ceil(current.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = current.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function handleTabChange(value: string) {
    setTab(value as TabKey);
    setPage(1);
  }

  function handlePeriodChange(value: PeriodKey) {
    setPeriod(value);
    setPage(1);
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tabs value={tab} onValueChange={handleTabChange}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="in_progress">
              Незавершені ({filtered.in_progress.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Завершені ({filtered.completed.length})
            </TabsTrigger>
          </TabsList>

          <PeriodFilter value={period} onChange={handlePeriodChange} />
        </div>

        <TabsContent value="in_progress">
          {pageItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Немає незавершених вправ.
            </p>
          ) : (
            <ExerciseGrid items={pageItems} />
          )}
        </TabsContent>

        <TabsContent value="completed">
          {pageItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Немає завершених вправ.
            </p>
          ) : (
            <ExerciseGrid items={pageItems} />
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-4">
        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </TooltipProvider>
  );
}

function ExerciseGrid({ items }: { items: ExerciseHistoryItem[] }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 grid-auto-rows-fr md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((exercise) => (
        <ExerciseCard key={exercise.id} exercise={exercise} />
      ))}
    </div>
  );
}
