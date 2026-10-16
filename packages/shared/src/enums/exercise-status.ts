export const EXERCISE_STATUS = {
  GENERATED: "generated",
  IN_PROGRESS: "in_progress",
  EVALUATED: "evaluated",
  REVIEWED: "reviewed",
} as const;

export type ExerciseStatus =
  (typeof EXERCISE_STATUS)[keyof typeof EXERCISE_STATUS];

export const EXERCISE_STATUS_VALUES = Object.values(
  EXERCISE_STATUS
) as ExerciseStatus[];
