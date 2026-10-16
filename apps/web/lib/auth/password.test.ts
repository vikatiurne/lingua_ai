import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hashes password with bcrypt format", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).toMatch(/^\$2[ab]\$\d{2}\$.{53}$/);
  });

  it("verifies correct password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for same password", async () => {
    const h1 = await hashPassword("secret123");
    const h2 = await hashPassword("secret123");
    expect(h1).not.toBe(h2);
  });
});
