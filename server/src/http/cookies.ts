/**
 * Minimal cookie handling.
 *
 * Written out rather than taken from a plugin for two reasons: the security
 * attributes on a session cookie are worth being explicit about, and the
 * plugin's type augmentation does not cross the package boundary into the web
 * app's typecheck.
 */

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  path?: string;
  maxAgeSeconds?: number;
};

export function serialiseCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const {
    httpOnly = true,
    secure = false,
    sameSite = "lax",
    path = "/",
    maxAgeSeconds,
  } = options;

  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];

  // httpOnly is the control that keeps the session out of reach of any script
  // running on the page, including an injected one.
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  parts.push(`SameSite=${sameSite[0]!.toUpperCase()}${sameSite.slice(1)}`);
  if (maxAgeSeconds !== undefined) parts.push(`Max-Age=${maxAgeSeconds}`);

  return parts.join("; ");
}

export function clearedCookie(name: string, path = "/"): string {
  return `${name}=; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};

  const out: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const index = pair.indexOf("=");
    if (index < 1) continue;

    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (!name) continue;

    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}
