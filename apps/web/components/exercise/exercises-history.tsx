"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Repeat,
  SlidersHorizontal,
} from "lucide-react";

import { ExerciseModeMenu } from "@/components/exercise/exercise-mode-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ExerciseHistoryItem = {
  id: string;
  topicName: string;
  subtopicName: string | null;
  status: string;
  isReview: boolean;
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

const STATUS_OPTIONS = [
  { key: "all", label: "Всі" },
  { key: "in_progress", label: "Незавершені" },
  { key: "completed", label: "Завершені" },
] as const;

const TYPE_OPTIONS = [
  { key: "all", label: "Всі" },
  { key: "regular", label: "Вправи" },
  { key: "review", label: "Робота над помилками" },
] as const;

const PERIOD_OPTIONS = [
  { key: "all", label: "Весь час", days: null },
  { key: "week", label: "Тиждень", days: 7 },
  { key: "month", label: "Місяць", days: 30 },
  { key: "year", label: "Рік", days: 365 },
] as const;

type PeriodKey = (typeof PERIOD_OPTIONS)[number]["key"];
type StatusKey = (typeof STATUS_OPTIONS)[number]["key"];
type TypeKey = (typeof TYPE_OPTIONS)[number]["key"];

type Filters = {
  status: StatusKey;
  type: TypeKey;
  topic: string;
  period: PeriodKey;
};

const DEFAULT_FILTERS: Filters = {
  status: "all",
  type: "all",
  topic: "",
  period: "all",
};

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

function ExerciseCard({
  exercise,
  number,
}: {
  exercise: ExerciseHistoryItem;
  number: number;
}) {
  const isEvaluated = exercise.status === "evaluated";

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 p-3 sm:p-4">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground sm:text-sm">
            {number}.
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate font-display text-sm font-semibold sm:text-base">
              {exercise.topicName}
            </CardTitle>
            {exercise.subtopicName ? (
              <p className="truncate text-sm text-muted-foreground">
                {exercise.subtopicName}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-xs text-muted-foreground">
                {formatDate(exercise.createdAt)}
              </p>
            </div>
          </div>
        </div>
        {isEvaluated ? (
          <IconLinkButton
            href={`/exercise/${exercise.id}/result?from=history`}
            label="Дивитись результат"
          >
            <Info className="h-4 w-4" />
          </IconLinkButton>
        ) : (
          <ExerciseModeMenu exerciseId={exercise.id} />
        )}
      </CardHeader>
      <CardFooter className="mt-auto flex h-10 items-center gap-2 border-t border-border/60 px-3 py-0 sm:px-4">
        {exercise.isReview ? (
          <Badge
            variant="secondary"
            className="gap-1 whitespace-nowrap px-1.5 py-0 text-[10px] font-medium"
          >
            <Repeat className="h-2.5 w-2.5 shrink-0" />
            Робота над помилками
          </Badge>
        ) : null}
        {isEvaluated ? (
          <div className=" flex shrink-0 items-center gap-2">
            <ScoreItem label="Topic" score={exercise.topicScore ?? 0} />
            <span aria-hidden className="text-border">
              ·
            </span>
            <ScoreItem label="Grammar" score={exercise.grammarScore ?? 0} />
          </div>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function ExerciseGrid({
  items,
  startIndex,
}: {
  items: ExerciseHistoryItem[];
  startIndex: number;
}) {
  return (
    <div className="grid auto-rows-fr grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((exercise, index) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          number={startIndex + index + 1}
        />
      ))}
    </div>
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

function RadioList<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-0.5">
      {options.map((option) => {
        const active = option.key === value;

        return (
          <label
            key={option.key}
            className={cn(
              "flex h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm transition-colors hover:bg-background has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring",
              active ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.key}
              checked={active}
              onChange={() => onChange(option.key)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                active ? "border-primary" : "border-border"
              )}
            >
              {active ? (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              ) : null}
            </span>
            <span className={cn("truncate", active && "font-medium")}>
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function FilterSection<T extends string>({
  value,
  label,
  summary,
  name,
  options,
  selected,
  onSelect,
}: {
  value: string;
  label: string;
  summary: string;
  name: string;
  options: readonly { key: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <AccordionItem value={value} className="border-b last:border-b-0">
      <AccordionTrigger className="gap-2 px-1.5 py-2 hover:no-underline">
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="shrink-0 text-sm text-muted-foreground">
            {label}
          </span>
          <span className="truncate text-sm font-medium">{summary}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-2 pt-0">
        <div
          className={options.length > 6 ? "max-h-56 overflow-y-auto" : undefined}
        >
          <RadioList
            name={name}
            label={label}
            options={options}
            value={selected}
            onChange={onSelect}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function ExercisesHistory({
  exercises,
}: {
  exercises: ExerciseHistoryItem[];
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);

  const topicOptions = useMemo(() => {
    const topics = Array.from(
      new Set(exercises.map((exercise) => exercise.topicName))
    ).sort((a, b) => a.localeCompare(b, "uk"));

    return [
      { key: "", label: "Всі" },
      ...topics.map((topic) => ({ key: topic, label: topic })),
    ];
  }, [exercises]);

  const filtered = useMemo(() => {
    const days =
      PERIOD_OPTIONS.find((option) => option.key === filters.period)?.days ??
      null;
    const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;

    return exercises.filter((exercise) => {
      if (cutoff !== null && new Date(exercise.createdAt).getTime() < cutoff) {
        return false;
      }
      if (filters.type === "review" && !exercise.isReview) return false;
      if (filters.type === "regular" && exercise.isReview) return false;
      if (filters.topic !== "" && exercise.topicName !== filters.topic) {
        return false;
      }

      const isEvaluated = exercise.status === "evaluated";
      if (filters.status === "in_progress" && isEvaluated) return false;
      if (filters.status === "completed" && !isEvaluated) return false;

      return true;
    });
  }, [exercises, filters]);

  const activeCount =
    (filters.status !== DEFAULT_FILTERS.status ? 1 : 0) +
    (filters.type !== DEFAULT_FILTERS.type ? 1 : 0) +
    (filters.topic !== DEFAULT_FILTERS.topic ? 1 : 0) +
    (filters.period !== DEFAULT_FILTERS.period ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function handleOpenChange(next: boolean) {
    if (next) setDraft(filters);
    setOpen(next);
  }

  function applyDraft() {
    setFilters(draft);
    setPage(1);
    setOpen(false);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setDraft(DEFAULT_FILTERS);
    setPage(1);
    setOpen(false);
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Знайдено: {filtered.length}
        </p>

        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="h-9 gap-1.5"
              aria-label={
                activeCount > 0 ? `Фільтр, активних: ${activeCount}` : "Фільтр"
              }
            >
              <SlidersHorizontal className="h-4 w-4" />
              Фільтр
              {activeCount > 0 ? (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="max-h-[var(--radix-popover-content-available-height)] w-64 overflow-y-auto p-2"
          >
            <Accordion type="single" collapsible>
              <FilterSection
                value="status"
                label="Стан"
                summary={
                  STATUS_OPTIONS.find((o) => o.key === draft.status)?.label ??
                  ""
                }
                name="history-status"
                options={STATUS_OPTIONS}
                selected={draft.status}
                onSelect={(status) =>
                  setDraft((value) => ({ ...value, status }))
                }
              />
              <FilterSection
                value="type"
                label="Тип"
                summary={
                  TYPE_OPTIONS.find((o) => o.key === draft.type)?.label ?? ""
                }
                name="history-type"
                options={TYPE_OPTIONS}
                selected={draft.type}
                onSelect={(type) => setDraft((value) => ({ ...value, type }))}
              />
              <FilterSection
                value="topic"
                label="Тема"
                summary={
                  topicOptions.find((o) => o.key === draft.topic)?.label ?? ""
                }
                name="history-topic"
                options={topicOptions}
                selected={draft.topic}
                onSelect={(topic) => setDraft((value) => ({ ...value, topic }))}
              />
              <FilterSection
                value="period"
                label="Дата"
                summary={
                  PERIOD_OPTIONS.find((o) => o.key === draft.period)?.label ??
                  ""
                }
                name="history-period"
                options={PERIOD_OPTIONS}
                selected={draft.period}
                onSelect={(period) =>
                  setDraft((value) => ({ ...value, period }))
                }
              />
            </Accordion>
            <div className="flex items-center gap-2 px-1 pt-2">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                onClick={applyDraft}
              >
                Застосувати
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={resetFilters}
              >
                Скинути
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-4 sm:mt-6">
        {pageItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Нічого не знайдено за вибраними фільтрами.
            </p>
            {activeCount > 0 ? (
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Скинути фільтри
              </Button>
            ) : null}
          </div>
        ) : (
          <ExerciseGrid
            items={pageItems}
            startIndex={(safePage - 1) * PAGE_SIZE}
          />
        )}
      </div>

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
