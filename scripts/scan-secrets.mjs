import fs from "node:fs";
import { execFileSync } from "node:child_process";
const rules = [new RegExp("AIza" + "Sy[A-Za-z0-9_-]{33}"), new RegExp("sbp" + "_[a-zA-Z0-9]{40}"), new RegExp("-----BEGIN " + "(RSA |EC )?PRIVATE KEY-----"), new RegExp("sb_secret" + "_[a-zA-Z0-9_-]{20,}")];
export function containsSecret(text) { return rules.some(rule => rule.test(text)); }
export function scan(paths) {
  let failed = false;
  for (const file of paths) {
    try { if (containsSecret(fs.readFileSync(file, "utf8"))) { console.error(`Secret pattern detected: ${file}`); failed = true; } }
    catch { console.error(`Cannot scan file: ${file}`); failed = true; }
  }
  return failed ? 1 : 0;
}
if (process.argv[1] && import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = scan(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)); }
  catch { console.error("Secret scanner failed"); process.exitCode = 1; }
}
