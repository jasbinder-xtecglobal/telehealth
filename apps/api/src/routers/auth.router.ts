import { z } from "zod";
import { env } from "../config/env.ts";
import { doctorType } from "../db/schema/enums.ts";
import { clearedCookie, serialiseCookie } from "../http/cookies.ts";
import {
  SESSION_COOKIE,
  SESSION_TTL_HOURS,
} from "../domain/auth/session.policy.ts";
import { doctorProcedure, publicProcedure, router } from "../trpc.ts";

/**
 * Authentication transport.
 *
 * The only router built on `publicProcedure`. It is also the only place that
 * touches cookies — the session token never reaches JavaScript in the browser.
 */

const signupInput = z.object({
  email: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(200),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  providerNumber: z.string().trim().min(4).max(12),
  prescriberNumber: z.string().trim().min(4).max(10),
  doctorType: z.enum(doctorType.enumValues),
  qualifications: z.string().max(200).optional(),
  mobile: z.string().max(30).optional(),
});

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // Enable in production; localhost is served over plain HTTP.
  secure: env.NODE_ENV === "production",
  maxAgeSeconds: SESSION_TTL_HOURS * 3600,
};

export const authRouter = router({
  signup: publicProcedure
    .input(signupInput)
    .mutation(({ ctx, input }) => ctx.services.auth.signup(input)),

  /** Live strength feedback, from the same rules the server enforces. */
  passwordFeedback: publicProcedure
    .input(z.object({ password: z.string().max(200), email: z.string().max(254).optional() }))
    .query(({ ctx, input }) =>
      ctx.services.auth.passwordFeedback(input.password, input.email),
    ),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(10).max(200) }))
    .mutation(({ ctx, input }) => ctx.services.auth.verifyEmail(input.token)),

  resendVerification: publicProcedure
    .input(z.object({ email: z.string().trim().max(254) }))
    .mutation(({ ctx, input }) =>
      ctx.services.auth.resendVerification(input.email),
    ),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().trim().max(254),
        password: z.string().max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.auth.login({
        email: input.email,
        password: input.password,
        userAgent: ctx.req.headers["user-agent"] ?? null,
        ipAddress: ctx.req.ip ?? null,
      });

      ctx.res.header(
        "set-cookie",
        serialiseCookie(SESSION_COOKIE, result.token, cookieOptions),
      );

      return {
        doctor: result.doctor,
        expiresAt: result.expiresAt,
        /** Returned for non-browser clients; browsers use the cookie. */
        token: result.token,
      };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    await ctx.services.auth.logout(ctx.token);
    ctx.res.header("set-cookie", clearedCookie(SESSION_COOKIE));
    return { ok: true as const };
  }),

  /** Null rather than 401 — the client uses this to decide where to route. */
  session: publicProcedure.query(({ ctx }) => ctx.doctor ?? null),

  me: doctorProcedure.query(({ ctx }) => ctx.doctor),

  /**
   * Prototype affordance: read the verification link without a mailbox.
   * Delete this before any real deployment — it discloses account emails.
   */
  devMailbox: publicProcedure.query(({ ctx }) => ctx.services.auth.recentEmails()),
});
