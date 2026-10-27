import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Smoke test suite", () => {
  it("runs vitest properly", () => {
    expect(1 + 1).toBe(2);
  });

  it("validates data using Zod schema", () => {
    const userSchema = z.object({
      id: z.string().uuid(),
      role: z.enum(["user", "admin"]),
    });

    const parsed = userSchema.safeParse({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      role: "user",
    });

    expect(parsed.success).toBe(true);
  });
});
