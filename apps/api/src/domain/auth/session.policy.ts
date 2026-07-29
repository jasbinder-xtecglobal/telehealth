/**
 * Session and verification-token lifetimes.
 *
 * Pure rules about when a credential stops being usable.
 */
import type { AccountStatus } from "../../db/schema/auth.ts";
import { forbidden } from "../errors.ts";

export const SESSION_TTL_HOURS = 12;
export const VERIFICATION_TTL_HOURS = 24;

export const SESSION_COOKIE = "telehealth_session";

export function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_TTL_HOURS * 3_600_000);
}

export function verificationExpiry(now: Date): Date {
  return new Date(now.getTime() + VERIFICATION_TTL_HOURS * 3_600_000);
}

export type SessionState = {
  expiresAt: Date;
  revokedAt: Date | null;
};

export function isSessionUsable(session: SessionState, now: Date): boolean {
  if (session.revokedAt !== null) return false;
  return session.expiresAt > now;
}

export type TokenState = {
  expiresAt: Date;
  consumedAt: Date | null;
};

/** Verification links are single use and time limited. */
export function isTokenRedeemable(token: TokenState, now: Date): boolean {
  if (token.consumedAt !== null) return false;
  return token.expiresAt > now;
}

/**
 * Only a verified, active account may hold a session.
 *
 * An unverified account can authenticate its password but must not receive a
 * session — otherwise email verification is decorative.
 */
export function assertAccountCanSignIn(status: AccountStatus): void {
  if (status === "pending_verification") {
    throw forbidden(
      "Verify your email address before signing in. Check your inbox for the link.",
    );
  }
  if (status === "suspended") {
    throw forbidden("This account is suspended. Contact practice administration.");
  }
}

export function canSignIn(status: AccountStatus): boolean {
  return status === "active";
}
