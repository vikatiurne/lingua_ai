export const PROGRESS_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  MASTERED: "mastered",
  NEEDS_REVIEW: "needs_review",
} as const;

export type ProgressStatus =
  (typeof PROGRESS_STATUS)[keyof typeof PROGRESS_STATUS];

export const PROGRESS_STATUS_VALUES = Object.values(
  PROGRESS_STATUS
) as ProgressStatus[];
