export type GenerationStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type PendingGeneration = {
  id: string;
  requestKey: string;
  createdAt: number;
};

export const GENERATION_KEY_TTL_MS = 5 * 60 * 1000;

const STORAGE_PREFIX = "lingua:exercise-generation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPendingGeneration(value: unknown): value is PendingGeneration {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.requestKey === "string" &&
    typeof value.createdAt === "number"
  );
}

function hashRequestKey(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function storageKey(namespace: string, requestKey: string): string {
  return `${STORAGE_PREFIX}:${namespace}:${hashRequestKey(requestKey)}`;
}

function randomUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function readPending(
  storage: GenerationStorage | null,
  key: string
): PendingGeneration | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPendingGeneration(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getBrowserGenerationStorage(): GenerationStorage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getOrCreateGenerationId(
  storage: GenerationStorage | null,
  namespace: string,
  requestKey: string,
  now = Date.now(),
  createId: () => string = randomUuid
): string {
  const key = storageKey(namespace, requestKey);
  const pending = readPending(storage, key);

  if (
    pending &&
    pending.requestKey === requestKey &&
    now >= pending.createdAt &&
    now - pending.createdAt < GENERATION_KEY_TTL_MS
  ) {
    return pending.id;
  }

  const id = createId();
  if (storage) {
    try {
      storage.setItem(
        key,
        JSON.stringify({
          id,
          requestKey,
          createdAt: now,
        } satisfies PendingGeneration)
      );
    } catch {
      // Storage may be unavailable (private mode); generation still works.
    }
  }
  return id;
}

export function clearGenerationId(
  storage: GenerationStorage | null,
  namespace: string,
  requestKey: string,
  id: string
): void {
  if (!storage) return;

  const key = storageKey(namespace, requestKey);
  const pending = readPending(storage, key);
  if (pending?.id !== id) return;

  try {
    storage.removeItem(key);
  } catch {
    // The pending key only affects duplicate protection, not the exercise.
  }
}
