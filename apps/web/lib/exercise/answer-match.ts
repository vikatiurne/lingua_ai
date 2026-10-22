// Shared normalization for comparing a student's answer with reference
// translations. Punctuation and extra spaces are ignored, apostrophes kept.

export function normalizeAnswerText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// True when the answer equals the reference or one of the accepted variants.
export function matchesAcceptedAnswer(
  userAnswer: string | undefined,
  accepted: string[]
): boolean {
  const normalized = normalizeAnswerText(userAnswer ?? "");
  if (!normalized) return false;
  return accepted.some((candidate) => {
    const normalizedCandidate = normalizeAnswerText(candidate);
    return normalizedCandidate.length > 0 && normalizedCandidate === normalized;
  });
}
