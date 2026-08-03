import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@telehealth/api";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/**
 * API endpoint. Same contract as the console — see `apps/web/src/shared/lib/trpc.ts`.
 *
 * The site only ever calls `intake.*`, which is unauthenticated, so it does not
 * need the cookie to stay first-party the way the console does. It is proxied
 * anyway so both apps are configured the same way.
 */
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:4000/trpc";

/**
 * Where the clinician console lives. The site links to it for sign-in rather
 * than reimplementing an auth screen that would then drift.
 */
export const CONSOLE_URL =
  (import.meta.env.VITE_CONSOLE_URL as string | undefined) ??
  "http://localhost:5173";
