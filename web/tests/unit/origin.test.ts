import { it, expect } from "vitest";
import { hasValidOrigin } from "@/lib/origin";
it("accepts the browser host after Next rewrites the internal request URL", () => {
  expect(hasValidOrigin({ url: "http://localhost:3197/api/auth/login", headers: new Headers({ host: "127.0.0.1:3197", origin: "http://127.0.0.1:3197" }) })).toBe(true);
});
it("rejects missing, null and cross-site origins", () => {
  for (const origin of ["", "null", "https://invalid.example"]) expect(hasValidOrigin({ url: "http://localhost:3197/api/sessions", headers: new Headers({ host: "127.0.0.1:3197", origin }) })).toBe(false);
});
