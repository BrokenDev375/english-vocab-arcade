export function getRequestOrigin(request: { url: string; headers: Headers }): string {
  const internal = new URL(request.url);
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || internal.host).split(",")[0].trim();
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || internal.protocol.replace(":", "");
  const result = new URL(`${protocol}://${host}`);
  if (!["http:", "https:"].includes(result.protocol) || result.host !== host) throw new Error("Invalid application origin");
  return result.origin;
}

/** Match the browser origin against the externally addressed host, before Next's internal URL rewriting. */
export function hasValidOrigin(request: { url: string; headers: Headers }, appUrl?: string): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    const url = new URL(request.url);
    const host = request.headers.get("host") || url.host;
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || url.protocol.replace(":", "");
    const externalHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim() || host;
    const allowed = new Set([url.origin, `${protocol}://${host}`, `${protocol}://${externalHost}`]);
    if (appUrl) allowed.add(new URL(appUrl).origin);
    return allowed.has(new URL(origin).origin) && new URL(origin).origin === origin;
  } catch { return false; }
}
