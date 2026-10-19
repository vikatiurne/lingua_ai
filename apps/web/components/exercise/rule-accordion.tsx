"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Markdown } from "@/components/ui/markdown";

export function RuleAccordion({
  short,
  full,
}: {
  short: string;
  full: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-accent/40 p-4">
      <Markdown className="text-sm leading-relaxed text-foreground">
        {short}
      </Markdown>

      <Accordion type="single" collapsible className="mt-2">
        <AccordionItem value="full-rule" className="border-b-0">
          <AccordionTrigger className="py-2 text-sm text-primary hover:no-underline">
            Показати повне правило
          </AccordionTrigger>
          <AccordionContent className="pb-0 text-xs leading-relaxed text-completed-text">
            <Markdown>{full}</Markdown>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
