"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function RuleAccordion({ short, full }: { short: string; full: string }) {
  return (
    <div className="rounded-lg border border-border bg-accent/40 p-4">
      <p className="text-sm leading-relaxed text-foreground">{short}</p>

      <Accordion type="single" collapsible className="mt-2">
        <AccordionItem value="full-rule" className="border-b-0">
          <AccordionTrigger className="py-2 text-sm text-primary hover:no-underline">
            Показати повне правило
          </AccordionTrigger>
          <AccordionContent className="whitespace-pre-line pb-0 text-sm leading-relaxed text-muted-foreground">
            {full}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
