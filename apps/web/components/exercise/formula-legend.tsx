"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const LEGEND: { symbol: string; label: string; meaning: string }[] = [
  { symbol: "S", label: "Subject", meaning: "Підмет" },
  { symbol: "V1", label: "Verb", meaning: "Дієслово в початковій формі" },
  { symbol: "V2", label: "Past Simple", meaning: "Дієслово в минулому часі" },
  {
    symbol: "V3",
    label: "Past Participle",
    meaning: "Третя форма дієслова",
  },
  { symbol: "V-ing", label: "Gerund", meaning: "Дієслово з -ing" },
  { symbol: "O", label: "Object", meaning: "Додаток" },
  { symbol: "N", label: "Noun", meaning: "Іменник" },
  { symbol: "Adj", label: "Adjective", meaning: "Прикметник" },
  { symbol: "Adv", label: "Adverb", meaning: "Прислівник" },
  { symbol: "Aux", label: "Auxiliary verb", meaning: "Допоміжне дієслово" },
];

export function FormulaLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Що означають літери?"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <p className="mb-2 text-xs font-semibold text-foreground">
          Позначення у формулах
        </p>
        <dl className="space-y-1.5 text-xs">
          {LEGEND.map((item) => (
            <div key={item.symbol} className="flex gap-2">
              <dt className="w-12 shrink-0 font-mono font-semibold text-primary">
                {item.symbol}
              </dt>
              <dd className="text-muted-foreground">
                <span className="text-foreground">{item.label}</span> —{" "}
                {item.meaning}
              </dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
