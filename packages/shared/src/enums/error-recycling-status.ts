export const ERROR_RECYCLING_STATUS = {
  ACTIVE: "active",
  ARCHIVED_SUCCESS: "archived_success",
  ARCHIVED_STUCK: "archived_stuck",
} as const;

export type ErrorRecyclingStatus =
  (typeof ERROR_RECYCLING_STATUS)[keyof typeof ERROR_RECYCLING_STATUS];

export const ERROR_RECYCLING_STATUS_VALUES = Object.values(
  ERROR_RECYCLING_STATUS
) as ErrorRecyclingStatus[];
