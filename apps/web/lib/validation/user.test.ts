import { describe, expect, it } from "vitest";
import { updateUserSchema } from "./user";

describe("updateUserSchema", () => {
  it("accepts a valid level", () => {
    const result = updateUserSchema.safeParse({ level: "B1" });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown level", () => {
    const result = updateUserSchema.safeParse({ level: "Z9" });
    expect(result.success).toBe(false);
  });

  it("rejects dailyMinutes above the maximum", () => {
    const result = updateUserSchema.safeParse({ dailyMinutes: 500 });
    expect(result.success).toBe(false);
  });

  it("accepts an empty object (all fields optional)", () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects a non-integer dailyMinutes", () => {
    const result = updateUserSchema.safeParse({ dailyMinutes: 30.5 });
    expect(result.success).toBe(false);
  });
});
