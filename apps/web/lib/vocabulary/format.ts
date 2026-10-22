import { pluralize } from "@/lib/i18n/plural";

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MONTH_DAY_FORMATTER = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
});

/**
 * Calendar day of the given date in the server timezone, as `YYYY-MM-DD`.
 */
export function toDateKey(date: Date): string {
  return DATE_KEY_FORMATTER.format(date);
}

/**
 * Human readable Ukrainian label of a date key, e.g. `22 Жовтня`.
 * The year is added only when it differs from the current one.
 */
export function formatDateLabel(dateKey: string): string {
  const parts = parseDateKey(dateKey);
  if (!parts) return dateKey;

  const { year, month, day } = parts;
  const date = new Date(year, month - 1, day);
  const formatted = MONTH_DAY_FORMATTER.formatToParts(date);
  const dayPart = formatted.find((part) => part.type === "day")?.value ?? "";
  const monthPart = formatted.find((part) => part.type === "month")?.value ?? "";

  const label = `${dayPart} ${capitalize(monthPart)}`;
  return year === new Date().getFullYear() ? label : `${label} ${year}`;
}

/**
 * Ukrainian plural for the word count, e.g. `1 слово`, `2 слова`, `5 слів`.
 */
export function formatWordCount(count: number): string {
  return `${count} ${pluralize(count, "слово", "слова", "слів")}`;
}

/**
 * Half-open day range [start, end) for a date key, in the server timezone.
 */
export function getDayRange(dateKey: string): { start: Date; end: Date } | null {
  const parts = parseDateKey(dateKey);
  if (!parts) return null;

  const { year, month, day } = parts;
  return {
    start: new Date(year, month - 1, day, 0, 0, 0, 0),
    end: new Date(year, month - 1, day + 1, 0, 0, 0, 0),
  };
}

function parseDateKey(
  dateKey: string
): { year: number; month: number; day: number } | null {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Reject overflowing dates such as 2026-02-31.
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
