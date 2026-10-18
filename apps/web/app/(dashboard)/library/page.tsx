import { CEFR_LEVEL, CEFR_LEVELS, type CEFRLevel } from "@lingua/shared";

import { LevelSelector } from "@/components/library/level-selector";
import { TopicList } from "@/components/library/topic-list";
import { requireUser } from "@/lib/auth/session";
import { loadTemplateFile } from "@/lib/slots/loader";

type LibraryPageProps = {
  searchParams: { level?: string | string[] };
};

function parseLevel(value: string | string[] | undefined): CEFRLevel | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  return CEFR_LEVELS.includes(raw as CEFRLevel) ? (raw as CEFRLevel) : null;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const user = await requireUser();

  const selectedLevel =
    parseLevel(searchParams.level) ?? user.level ?? CEFR_LEVEL.A1;

  const templateFile = await loadTemplateFile(selectedLevel);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Бібліотека тем
        </h1>
        <p className="text-sm text-muted-foreground">
          Оберіть рівень і тему, яку хочете потренувати зараз — без прив&apos;язки
          до плану.
        </p>
      </div>
      <LevelSelector current={selectedLevel} />
      <TopicList topics={templateFile.topics} level={selectedLevel} />
    </div>
  );
}
