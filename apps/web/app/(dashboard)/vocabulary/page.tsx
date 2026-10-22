import {
  VocabularyDashboard,
  type VocabularyGroupView,
} from "@/components/vocabulary/vocabulary-dashboard";
import { requireUser } from "@/lib/auth/session";
import { formatDateLabel } from "@/lib/vocabulary/format";
import {
  getGroupedVocabulary,
  type VocabularyGroup,
} from "@/lib/vocabulary/vocabulary";

export default async function VocabularyPage() {
  const user = await requireUser();
  const grouped = await getGroupedVocabulary(user.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Vocabulary
        </h1>
        <p className="text-sm text-muted-foreground">
          Слова, збережені з вправ. Оберіть дату, щоб повторити їх картками або
          написанням.
        </p>
      </div>

      <VocabularyDashboard
        unlearned={grouped.unlearned.map(toGroupView)}
        learned={grouped.learned.map(toGroupView)}
      />
    </div>
  );
}

function toGroupView(group: VocabularyGroup): VocabularyGroupView {
  return {
    date: group.date,
    label: formatDateLabel(group.date),
    flashcardsCount: group.flashcardsCount,
    flashcardsWords: group.flashcardsWords,
    spellingCount: group.spellingCount,
    spellingWords: group.spellingWords,
  };
}
