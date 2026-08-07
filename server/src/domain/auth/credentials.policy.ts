/**
 * Credential validation and account-lockout rules.
 *
 * Pure — no hashing, no database, no clock beyond what is passed in. The
 * hashing itself is an infrastructure concern behind `PasswordHasherPort`;
 * what counts as an *acceptable* credential is a business rule and lives here.
 */
import { invalid } from "../errors.ts";

/* ------------------------------------------------------------------ *
 * Email
 * ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Email is the login identity, so it is normalised before storage or lookup. */
export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const email = normaliseEmail(raw);
  return email.length <= 254 && EMAIL_RE.test(email);
}

/* ------------------------------------------------------------------ *
 * Password
 * ------------------------------------------------------------------ */

export const MIN_PASSWORD_LENGTH = 12;

/**
 * Deliberately short list. Real deployments check against a breached-password
 * corpus (Have I Been Pwned's k-anonymity API or a local Pwned Passwords set) —
 * that is a `PasswordBreachPort`, not a hardcoded array.
 */
const OBVIOUS_PASSWORDS = new Set([
  "password",
  "password123",
  "passw0rd",
  "qwertyuiop",
  "letmein",
  "welcome1",
  "administrator",
  "doctordoctor",
  "changeme123",
  "iloveyou123",
]);

export type PasswordProblem =
  | "too_short"
  | "needs_lowercase"
  | "needs_uppercase"
  | "needs_digit"
  | "too_common"
  | "contains_email";

const PROBLEM_MESSAGES: Record<PasswordProblem, string> = {
  too_short: `Use at least ${MIN_PASSWORD_LENGTH} characters`,
  needs_lowercase: "Include a lowercase letter",
  needs_uppercase: "Include an uppercase letter",
  needs_digit: "Include a number",
  too_common: "This password is too easily guessed",
  contains_email: "Do not include your email address",
};

/**
 * Returns problems as data so signup can render a live checklist and the
 * service can enforce the same list — one definition, two consumers.
 */
export function checkPassword(password: string, email?: string): PasswordProblem[] {
  const problems: PasswordProblem[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) problems.push("too_short");
  if (!/[a-z]/.test(password)) problems.push("needs_lowercase");
  if (!/[A-Z]/.test(password)) problems.push("needs_uppercase");
  if (!/\d/.test(password)) problems.push("needs_digit");
  if (OBVIOUS_PASSWORDS.has(password.toLowerCase())) problems.push("too_common");

  const localPart = email ? normaliseEmail(email).split("@")[0] : "";
  if (localPart && localPart.length >= 3 && password.toLowerCase().includes(localPart)) {
    problems.push("contains_email");
  }

  return problems;
}

export function describePasswordProblems(problems: readonly PasswordProblem[]): string[] {
  return problems.map((p) => PROBLEM_MESSAGES[p]);
}

export function assertPasswordAcceptable(password: string, email?: string): void {
  const problems = checkPassword(password, email);
  if (problems.length > 0) {
    throw invalid(describePasswordProblems(problems).join(". "));
  }
}

/* ------------------------------------------------------------------ *
 * Prescriber identifiers
 * ------------------------------------------------------------------ */

/**
 * Format check only.
 *
 * A real build must verify the Medicare provider-number check digit and
 * confirm AHPRA registration against the national register — neither is
 * implemented here, and neither is optional in production.
 */
export function isValidProviderNumber(value: string): boolean {
  return /^\d{5,7}[0-9A-Z]{1,2}$/.test(value.trim().toUpperCase());
}

export function isValidPrescriberNumber(value: string): boolean {
  return /^\d{5,8}$/.test(value.trim());
}

/* ------------------------------------------------------------------ *
 * Lockout
 * ------------------------------------------------------------------ */

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export type LockoutState = {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

export function isLockedOut(state: LockoutState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil > now;
}

export function minutesUntilUnlock(state: LockoutState, now: Date): number {
  if (!state.lockedUntil || state.lockedUntil <= now) return 0;
  return Math.ceil((state.lockedUntil.getTime() - now.getTime()) / 60_000);
}

/** Next lockout state after a failed attempt. */
export function registerFailure(state: LockoutState, now: Date): LockoutState {
  const attempts = state.failedLoginAttempts + 1;

  return attempts >= MAX_FAILED_ATTEMPTS
    ? {
        failedLoginAttempts: attempts,
        lockedUntil: new Date(now.getTime() + LOCKOUT_MINUTES * 60_000),
      }
    : { failedLoginAttempts: attempts, lockedUntil: null };
}

export function clearFailures(): LockoutState {
  return { failedLoginAttempts: 0, lockedUntil: null };
}
