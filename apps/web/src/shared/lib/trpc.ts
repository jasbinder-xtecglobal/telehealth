import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@telehealth/api";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export const API_URL = "http://localhost:4000/trpc";

// The acting doctor now comes from the session cookie. The previous
// `x-doctor-id` header stand-in has been removed — impersonating another
// clinician by editing localStorage is not something a prescribing system
// should permit, even in a prototype.
