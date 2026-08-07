import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@telehealth/api";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/**
 * API endpoint.
 *
 * Set `VITE_API_URL` at build time. Two shapes are valid:
 *
 *   /trpc                          — same-origin, via a proxy rewrite (preferred:
 *                                    the session cookie stays first-party)
 *   https://api.example.com/trpc   — cross-origin, requires COOKIE_SAMESITE=none
 *                                    on the API and is subject to third-party
 *                                    cookie blocking in Safari
 */
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:4000/trpc";

// The acting doctor now comes from the session cookie. The previous
// `x-doctor-id` header stand-in has been removed — impersonating another
// clinician by editing localStorage is not something a prescribing system
// should permit, even in a prototype.
