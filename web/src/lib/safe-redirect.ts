/**
 * Validates a redirect target URL to prevent open redirect vulnerabilities.
 * Only relative application paths (e.g. '/dashboard', '/sets/abc') are allowed.
 */
export function getSafeRedirectUrl(target: string | null | undefined, fallback: string = "/dashboard"): string {
  if (!target || /[\u0000-\u001f\u007f]/.test(target)) return fallback;

  // Must begin with a single slash and not double slashes or backslashes
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return fallback;
  }

  // Reject URLs containing protocol prefixes or control chars
  if (target.includes(":") || target.includes("\\") || target.includes("\0")) {
    return fallback;
  }

  return target;
}
