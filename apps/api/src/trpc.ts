import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import superjson from "superjson";
import { container } from "./container.ts";
import { SESSION_COOKIE } from "./domain/auth/session.policy.ts";
import { DomainError, type DomainErrorCode } from "./domain/errors.ts";
import { parseCookies } from "./http/cookies.ts";

/**
 * tRPC setup.
 *
 * The transport boundary — the only place that knows about HTTP semantics.
 * Services and domain code throw `DomainError` and stay transport-agnostic.
 */

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  // Session travels in an httpOnly cookie. A bearer header is accepted too so
  // scripts and tests can authenticate without a cookie jar.
  const cookieToken = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = cookieToken ?? bearer;

  const doctor = await container.services.auth.resolveSession(token);

  return {
    req,
    res,
    token,
    doctor,
    services: container.services,
    ports: container.ports,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const DOMAIN_TO_TRPC: Record<DomainErrorCode, TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  FORBIDDEN: "FORBIDDEN",
  PRECONDITION_FAILED: "BAD_REQUEST",
  INVALID: "BAD_REQUEST",
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    if (cause instanceof DomainError) {
      return {
        ...shape,
        message: cause.message,
        data: { ...shape.data, domain: cause.code },
      };
    }
    return shape;
  },
});

export const router = t.router;

/** Translates domain errors into tRPC errors so routers never do it themselves. */
const translateDomainErrors = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (err) {
    if (err instanceof DomainError) {
      throw new TRPCError({
        code: DOMAIN_TO_TRPC[err.code],
        message: err.message,
        cause: err,
      });
    }
    throw err;
  }
});

/** Unauthenticated. Signup, login, verification only. */
export const publicProcedure = t.procedure.use(translateDomainErrors);

/**
 * Requires a live session belonging to an active, verified account.
 * Everything clinical hangs off this.
 */
export const doctorProcedure = t.procedure
  .use(translateDomainErrors)
  .use(({ ctx, next }) => {
    if (!ctx.doctor) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Sign in to continue",
      });
    }
    return next({ ctx: { ...ctx, doctor: ctx.doctor } });
  });
