import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../errors.ts";
import {
  assertPasswordAcceptable,
  checkPassword,
  clearFailures,
  isLockedOut,
  isValidEmail,
  isValidPrescriberNumber,
  isValidProviderNumber,
  LOCKOUT_MINUTES,
  MAX_FAILED_ATTEMPTS,
  minutesUntilUnlock,
  normaliseEmail,
  registerFailure,
  type LockoutState,
} from "./credentials.policy.ts";

describe("email", () => {
  it("normalises case and whitespace", () => {
    assert.equal(normaliseEmail("  Dr.Smith@Example.COM "), "dr.smith@example.com");
  });

  it("accepts ordinary addresses", () => {
    assert.ok(isValidEmail("david.szekely@example.test"));
    assert.ok(isValidEmail("a+tag@sub.domain.org"));
  });

  it("rejects malformed addresses", () => {
    for (const bad of ["", "no-at-sign", "two@@at.com", "trailing@dot.", "sp ace@x.com"]) {
      assert.equal(isValidEmail(bad), false, `expected "${bad}" to be rejected`);
    }
  });

  it("rejects an over-long address", () => {
    assert.equal(isValidEmail(`${"a".repeat(250)}@example.com`), false);
  });
});

describe("password strength", () => {
  const strong = "Nightshift2026Rounds";

  it("accepts a strong password", () => {
    assert.deepEqual(checkPassword(strong, "david@example.test"), []);
    assert.doesNotThrow(() => assertPasswordAcceptable(strong, "david@example.test"));
  });

  it("rejects a short password", () => {
    assert.ok(checkPassword("Ab1cdef").includes("too_short"));
  });

  it("requires mixed case and a digit", () => {
    assert.ok(checkPassword("alllowercaseonly").includes("needs_uppercase"));
    assert.ok(checkPassword("ALLUPPERCASEONLY").includes("needs_lowercase"));
    assert.ok(checkPassword("NoDigitsInHere").includes("needs_digit"));
  });

  it("rejects an obviously guessable password", () => {
    assert.ok(checkPassword("Password123".toLowerCase()).includes("too_common"));
  });

  it("rejects a password containing the email local part", () => {
    const problems = checkPassword("Szekely2026Login", "szekely@example.test");
    assert.ok(problems.includes("contains_email"));
  });

  it("throws with a readable message", () => {
    assert.throws(() => assertPasswordAcceptable("short"), DomainError);
    assert.throws(() => assertPasswordAcceptable("short"), /at least 12 characters/i);
  });
});

describe("prescriber identifiers", () => {
  it("accepts well-formed provider numbers", () => {
    assert.ok(isValidProviderNumber("9900001A"));
    assert.ok(isValidProviderNumber("241234 1A".replace(" ", "")));
  });

  it("rejects malformed provider numbers", () => {
    for (const bad of ["", "abc", "12", "99000011234567"]) {
      assert.equal(isValidProviderNumber(bad), false, `expected "${bad}" rejected`);
    }
  });

  it("accepts numeric prescriber numbers only", () => {
    assert.ok(isValidPrescriberNumber("9900001"));
    assert.equal(isValidPrescriberNumber("990000A"), false);
  });
});

describe("account lockout", () => {
  const NOW = new Date("2026-07-28T20:00:00Z");
  const fresh: LockoutState = { failedLoginAttempts: 0, lockedUntil: null };

  it("does not lock before the threshold", () => {
    let state = fresh;
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) state = registerFailure(state, NOW);

    assert.equal(state.failedLoginAttempts, MAX_FAILED_ATTEMPTS - 1);
    assert.equal(isLockedOut(state, NOW), false);
  });

  it("locks on the threshold attempt", () => {
    let state = fresh;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) state = registerFailure(state, NOW);

    assert.equal(isLockedOut(state, NOW), true);
    assert.equal(minutesUntilUnlock(state, NOW), LOCKOUT_MINUTES);
  });

  it("expires the lock once the window passes", () => {
    let state = fresh;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) state = registerFailure(state, NOW);

    const later = new Date(NOW.getTime() + (LOCKOUT_MINUTES + 1) * 60_000);
    assert.equal(isLockedOut(state, later), false);
    assert.equal(minutesUntilUnlock(state, later), 0);
  });

  it("clears the counter on a successful sign-in", () => {
    const cleared = clearFailures();
    assert.equal(cleared.failedLoginAttempts, 0);
    assert.equal(isLockedOut(cleared, NOW), false);
  });
});
