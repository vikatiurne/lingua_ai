export const MATERIAL_TYPE = {
  PODCAST: "podcast",
  FILM: "film",
  ARTICLE: "article",
  SERIES: "series",
  BOOK: "book",
  VIDEO: "video",
} as const;

export type MaterialType = (typeof MATERIAL_TYPE)[keyof typeof MATERIAL_TYPE];

export const MATERIAL_TYPE_VALUES = Object.values(
  MATERIAL_TYPE
) as MaterialType[];
