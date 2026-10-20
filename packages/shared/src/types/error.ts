import type { ErrorCategory, ErrorType } from "../enums/error-type";
import type { ErrorRecyclingStatus } from "../enums/error-recycling-status";

export type UserError = {
  id: string;
  userId: string;
  exerciseId: string;
  type: ErrorType;
  sentence: string;
  userAnswer: string;
  reference: string;
  explanation: string;
  category?: ErrorCategory;
  word?: string;
  translation?: string;

  // Recycling tracking
  timesRecycled: number;
  successCount: number;
  failureCount: number;
  status: ErrorRecyclingStatus;
  archivedAt?: string;

  createdAt: string;
  updatedAt: string;
};
