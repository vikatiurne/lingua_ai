import { describe, expect, it } from "vitest";
import {
  GENERATION_KEY_TTL_MS,
  clearGenerationId,
  getOrCreateGenerationId,
  type GenerationStorage,
} from "./generation-key";

class MemoryStorage implements GenerationStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }

  get keys(): string[] {
    return [...this.values.keys()];
  }
}

describe("getOrCreateGenerationId", () => {
  it("reuses the id for the same request key across reloads", () => {
    const storage = new MemoryStorage();
    let calls = 0;
    const createId = () => {
      calls += 1;
      return `id-${calls}`;
    };

    const first = getOrCreateGenerationId(storage, "app", "params", 1000, createId);
    const second = getOrCreateGenerationId(storage, "app", "params", 2000, createId);

    expect(first).toBe("id-1");
    expect(second).toBe("id-1");
    expect(calls).toBe(1);
  });

  it("creates a new id when the request parameters change", () => {
    const storage = new MemoryStorage();
    let counter = 0;

    const first = getOrCreateGenerationId(storage, "app", "one", 1000, () => {
      counter += 1;
      return `id-${counter}`;
    });
    const second = getOrCreateGenerationId(storage, "app", "two", 1000, () => {
      counter += 1;
      return `id-${counter}`;
    });

    expect(second).not.toBe(first);
  });

  it("creates a new id after the pending key expires", () => {
    const storage = new MemoryStorage();
    let counter = 0;

    const first = getOrCreateGenerationId(storage, "app", "params", 1000, () => {
      counter += 1;
      return `id-${counter}`;
    });
    const second = getOrCreateGenerationId(
      storage,
      "app",
      "params",
      1000 + GENERATION_KEY_TTL_MS,
      () => {
        counter += 1;
        return `id-${counter}`;
      }
    );

    expect(second).not.toBe(first);
  });

  it("keeps working when storage is unavailable", () => {
    expect(
      getOrCreateGenerationId(null, "app", "params", 1000, () => "fresh-id")
    ).toBe("fresh-id");
  });

  it("ignores corrupted stored data", () => {
    const storage = new MemoryStorage();
    getOrCreateGenerationId(storage, "app", "params", 1000, () => "first-id");
    storage.setItem(storage.keys[0]!, "not-json");

    expect(
      getOrCreateGenerationId(storage, "app", "params", 2000, () => "fresh-id")
    ).toBe("fresh-id");
  });
});

describe("clearGenerationId", () => {
  it("removes only the matching pending generation", () => {
    const storage = new MemoryStorage();
    const first = getOrCreateGenerationId(
      storage,
      "app",
      "params",
      1000,
      () => "first-id"
    );

    clearGenerationId(storage, "app", "params", "other-id");
    expect(
      getOrCreateGenerationId(storage, "app", "params", 2000, () => "new-id")
    ).toBe(first);

    clearGenerationId(storage, "app", "params", first);
    expect(
      getOrCreateGenerationId(storage, "app", "params", 2000, () => "new-id")
    ).toBe("new-id");
  });
});
