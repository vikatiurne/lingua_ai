import { CEFR_LEVEL } from "@lingua/shared";

import { LevelSelector } from "@/components/library/level-selector";
import { TopicList } from "@/components/library/topic-list";
import { requireUser } from "@/lib/auth/session";
import { parseLevel } from "@/lib/level";
import { loadTemplateFile } from "@/lib/slots/loader";

type LibraryPageProps = {
  searchParams: { level?: string | string[] };
};

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
