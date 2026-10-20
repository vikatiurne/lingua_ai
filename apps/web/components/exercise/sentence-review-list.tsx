import type { Sentence } from "./sentence-review-card";
import { SentenceReviewCard } from "./sentence-review-card";

type SentenceReviewListProps = {
  sentences: Sentence[];
};

export function SentenceReviewList({ sentences }: SentenceReviewListProps) {
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold">Sentence review</h2>
      <div className="space-y-2">
        {sentences.map((sentence) => (
          <SentenceReviewCard key={sentence.id} sentence={sentence} />
        ))}
      </div>
    </div>
  );
}
