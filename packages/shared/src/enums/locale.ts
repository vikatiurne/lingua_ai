export const LOCALE = {
  UK: "uk",
  EN: "en",
} as const;

export type Locale = (typeof LOCALE)[keyof typeof LOCALE];

export const LOCALES = Object.values(LOCALE) as Locale[];

export const DEFAULT_LOCALE: Locale = LOCALE.UK;
