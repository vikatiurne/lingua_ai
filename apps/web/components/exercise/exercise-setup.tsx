"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ExerciseMode = "pdf" | "app";

const COUNT_MIN = 1;
const COUNT_MAX = 20;

function clampCount(value: number): number {
  if (Number.isNaN(value)) return 5;
  return Math.min(COUNT_MAX, Math.max(COUNT_MIN, value));
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
  const [mode, setMode] = useState<ExerciseMode>("pdf");
  const [uaEnCount, setUaEnCount] = useState(5);
  const [enUaCount, setEnUaCount] = useState(5);

  const handleStart = () => {
    const query = new URLSearchParams({
      level,
      topic,
      subtopic,
      uaEn: String(clampCount(uaEnCount)),
      enUa: String(clampCount(enUaCount)),
    });
    router.push(`/exercise/${mode}?${query.toString()}`);
  };

  return (
    <div className="space-y-6 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Режим виконання</Label>
        <Tabs value={mode} onValueChange={(value) => setMode(value as ExerciseMode)}>
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
          <Label htmlFor="uaEnCount">Скільки речень укр → англ</Label>
          <Input
            id="uaEnCount"
            type="number"
            min={COUNT_MIN}
            max={COUNT_MAX}
            value={uaEnCount}
            onChange={(event) => setUaEnCount(Number(event.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="enUaCount">Скільки речень англ → укр</Label>
          <Input
            id="enUaCount"
            type="number"
            min={COUNT_MIN}
            max={COUNT_MAX}
            value={enUaCount}
            onChange={(event) => setEnUaCount(Number(event.target.value))}
          />
        </div>
      </div>

      <Button onClick={handleStart} className="w-full sm:w-auto">
        Почати
      </Button>
    </div>
  );
}
