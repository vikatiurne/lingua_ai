"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ExerciseMode = "pdf" | "app";

const COUNT_DEFAULT = "5";
const COUNT_MAX = 20;

function parseCount(value: string): number {
  if (value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : Math.min(COUNT_MAX, parsed);
}

function readInitialMode(value: string | null): ExerciseMode {
  return value === "pdf" ? "pdf" : "app";
}

function readInitialCount(value: string | null): string {
  if (value === null) return COUNT_DEFAULT;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return COUNT_DEFAULT;
  return String(Math.min(COUNT_MAX, parsed));
}

export function ExerciseSetup({
  level,
  topic,
  subtopic,
}: {
  level: string;
  topic: string;
  subtopic: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<ExerciseMode>(() =>
    readInitialMode(searchParams.get("mode"))
  );
  const [ukEn, setUkEn] = useState(() =>
    readInitialCount(searchParams.get("ukEn"))
  );
  const [enUk, setEnUk] = useState(() =>
    readInitialCount(searchParams.get("enUk"))
  );

  const ukEnCount = parseCount(ukEn);
  const enUkCount = parseCount(enUk);
  const totalCount = ukEnCount + enUkCount;
  const isCountValid = totalCount >= 1 && totalCount <= COUNT_MAX;

  function persistState(patch: {
    mode?: ExerciseMode;
    ukEn?: string;
    enUk?: string;
  }) {
    const next = {
      mode: patch.mode ?? mode,
      ukEn: patch.ukEn ?? ukEn,
      enUk: patch.enUk ?? enUk,
    };
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", next.mode);
    params.set("ukEn", next.ukEn);
    params.set("enUk", next.enUk);
    router.replace(`?${params.toString()}`);
  }

  const handleModeChange = (value: string) => {
    const nextMode = value as ExerciseMode;
    setMode(nextMode);
    persistState({ mode: nextMode });
  };

  const handleUkEnChange = (value: string) => {
    setUkEn(value);
    persistState({ ukEn: value });
  };

  const handleEnUkChange = (value: string) => {
    setEnUk(value);
    persistState({ enUk: value });
  };

  const handleStart = () => {
    if (!isCountValid) return;
    const query = new URLSearchParams({
      level,
      topic,
      subtopic,
      ukEn: String(ukEnCount),
      enUk: String(enUkCount),
    });
    router.push(`/exercise/${mode}?${query.toString()}`);
  };

  return (
    <div className="space-y-6 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Режим виконання</Label>
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="pdf">Роздрукувати PDF</TabsTrigger>
            <TabsTrigger value="app">Виконати в додатку</TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === "app" && (
          <p className="text-sm text-muted-foreground">
            Якщо не знаєте переклад слова, поставте{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">
              ...
            </code>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ukEnCount">Скільки речень укр → англ</Label>
          <Input
            id="ukEnCount"
            type="number"
            min={0}
            max={COUNT_MAX}
            value={ukEn}
            onChange={(event) =>
              handleUkEnChange(event.target.value.replace(/[^0-9]/g, ""))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="enUkCount">Скільки речень англ → укр</Label>
          <Input
            id="enUkCount"
            type="number"
            min={0}
            max={COUNT_MAX}
            value={enUk}
            onChange={(event) =>
              handleEnUkChange(event.target.value.replace(/[^0-9]/g, ""))
            }
          />
        </div>
      </div>

      {!isCountValid ? (
        <p className="text-sm font-medium text-destructive">
          {totalCount < 1
            ? "Оберіть хоча б одне речення для перекладу"
            : `Максимум ${COUNT_MAX} речень за тренування`}
        </p>
      ) : null}

      <Button
        onClick={handleStart}
        disabled={!isCountValid}
        className="w-full sm:w-auto"
      >
        Почати
      </Button>
    </div>
  );
}
