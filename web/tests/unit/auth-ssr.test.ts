import { describe, it, expect } from "vitest";
import { getSafeRedirectUrl } from "@/lib/safe-redirect";

describe("T04 - Auth SSR & Safe Redirect Helper", () => {
  it("allows safe internal relative application paths", () => {
    expect(getSafeRedirectUrl("/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/sets/abc-123")).toBe("/sets/abc-123");
    expect(getSafeRedirectUrl("/explore?topic=travel")).toBe("/explore?topic=travel");
    expect(getSafeRedirectUrl(null)).toBe("/dashboard");
    expect(getSafeRedirectUrl(undefined)).toBe("/dashboard");
  });

  it("blocks open redirect attempts to external protocols or domains", () => {
    expect(getSafeRedirectUrl("https://evil.example.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("http://attacker.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("//evil.example.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/\\evil.example.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/dashboard");
    expect(getSafeRedirectUrl("data:text/html,<script>alert(1)</script>")).toBe("/dashboard");
  });

  it("supports custom fallback targets", () => {
    expect(getSafeRedirectUrl("https://evil.com", "/login")).toBe("/login");
    expect(getSafeRedirectUrl(null, "/custom-fallback")).toBe("/custom-fallback");
  });
});
