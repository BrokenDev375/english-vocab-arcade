import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { containsSecret, scan } from "./scan-secrets.mjs";
test("synthetic private-key and token patterns are detected without printing their values", () => {
  assert.equal(containsSecret("-----BEGIN " + "PRIVATE KEY-----"), true);
  assert.equal(containsSecret("-----BEGIN " + "RSA PRIVATE KEY-----"), true);
  assert.equal(containsSecret("AIza" + "Sy" + "x".repeat(33)), true);
  assert.equal(containsSecret("ordinary source code"), false);
});
test("clean files pass and scanner read errors fail closed", () => {
  const dir = mkdtempSync(join(tmpdir(), "eva-secret-scan-"));
  try { const file = join(dir,"clean.txt"); writeFileSync(file,"clean"); assert.equal(scan([file]),0); assert.equal(scan([join(dir,"missing")]),1); }
  finally { const checkedDir = realpathSync(dir); assert.equal(dirname(checkedDir).toLowerCase(), realpathSync(tmpdir()).toLowerCase()); rmSync(checkedDir,{recursive:true}); }
});
