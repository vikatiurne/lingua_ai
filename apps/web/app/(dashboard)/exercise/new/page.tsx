import { redirect } from "next/navigation";

import { ExerciseSetup } from "@/components/exercise/exercise-setup";
import { RuleAccordion } from "@/components/exercise/rule-accordion";
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Тема: {topic} → {subtopic}
        </h1>
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
