import Link from "next/link";
import { redirect } from "next/navigation";

import { ExerciseSetup } from "@/components/exercise/exercise-setup";
import { FormulaLegend } from "@/components/exercise/formula-legend";
import { RuleAccordion } from "@/components/exercise/rule-accordion";
import { Badge } from "@/components/ui/badge";
import { formatLevelCode, parseLevel } from "@/lib/level";
import { loadRule } from "@/lib/rules/loader";

type ExerciseNewPageProps = {
  searchParams: {
    level?: string | string[];
    topic?: string | string[];
    subtopic?: string | string[];
  };
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExerciseNewPage({
  searchParams,
}: ExerciseNewPageProps) {
  const params = await searchParams;

  const level = first(params.level);
  const topic = first(params.topic);
  const subtopic = first(params.subtopic);

  if (!level || !topic || !subtopic) {
    redirect("/library");
  }

  const rule = await loadRule(level, topic, subtopic);
  const parsedLevel = parseLevel(level);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Тема: {topic} → {subtopic}
          </h1>
          {parsedLevel ? (
            <Link
              href={`/library?level=${parsedLevel}`}
              aria-label={`До бібліотеки: ${formatLevelCode(parsedLevel)}`}
            >
              <Badge>{formatLevelCode(parsedLevel)}</Badge>
            </Link>
          ) : null}
        </div>

        {rule.formula.trim() ? (
          <div className="flex items-center gap-2 ">
            <code className="min-w-0 whitespace-pre-wrap break-words font-mono text-lg text-primary">
              {rule.formula}
            </code>
            <FormulaLegend />
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Прочитайте правило, оберіть режим і кількість речень.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-1 lg:sticky lg:top-24">
          <RuleAccordion short={rule.short} full={rule.full} />
        </div>

        <div className="lg:col-span-2">
          <ExerciseSetup level={level} topic={topic} subtopic={subtopic} />
        </div>
      </div>
    </div>
  );
}
