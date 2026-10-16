export const ERROR_TYPE = {
  TOPIC: "topic",
  GENERAL: "general",
} as const;

export type ErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE];

export const ERROR_TYPE_VALUES = Object.values(ERROR_TYPE) as ErrorType[];

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  topic: "Помилка за темою",
  general: "Загальна граматична помилка",
};
