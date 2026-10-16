import type { SlotLevel } from "../enums/slot-level";

export type SlotValue = string[];

export type SlotWithLevels = {
  basic?: SlotValue;
  intermediate?: SlotValue;
  advanced?: SlotValue;
};

export type SlotReference = {
  $ref: string;
  level?: SlotLevel;
};

export type SlotEntry = SlotValue | SlotWithLevels | SlotReference;

export type SlotFile = {
  level: string;
  version: string;
  description?: string;
  usage?: string;
  slots: Record<string, unknown>;
};

export type SlotNounsFile = SlotFile;
