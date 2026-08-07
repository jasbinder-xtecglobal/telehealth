import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../errors.ts";
import {
  assertAccountCanSignIn,
  canSignIn,
  isSessionUsable,
  isTokenRedeemable,
  SESSION_TTL_HOURS,
  sessionExpiry,
  VERIFICATION_TTL_HOURS,
  verificationExpiry,
} from "./session.policy.ts";

const NOW = new Date("2026-07-28T20:00:00Z");
const hours = (n: number) => new Date(NOW.getTime() + n * 3_600_000);

describe("lifetimes", () => {
  it("gives a session the configured window", () => {
    assert.equal(sessionExpiry(NOW).getTime(), hours(SESSION_TTL_HOURS).getTime());
  });

  it("gives a verification link the configured window", () => {
    assert.equal(
      verificationExpiry(NOW).getTime(),
      hours(VERIFICATION_TTL_HOURS).getTime(),
    );
  });
});

describe("session usability", () => {
  it("accepts a live session", () => {
    assert.ok(isSessionUsable({ expiresAt: hours(1), revokedAt: null }, NOW));
  });

  it("rejects an expired session", () => {
    assert.equal(isSessionUsable({ expiresAt: hours(-1), revokedAt: null }, NOW), false);
  });

  it("rejects a revoked session even before expiry", () => {
    assert.equal(
      isSessionUsable({ expiresAt: hours(5), revokedAt: hours(-1) }, NOW),
      false,
      "logout must take effect immediately, not at expiry",
    );
  });
});

describe("verification tokens", () => {
  it("accepts an unused, unexpired token", () => {
    assert.ok(isTokenRedeemable({ expiresAt: hours(2), consumedAt: null }, NOW));
  });

  it("rejects a token that has already been used", () => {
    assert.equal(
      isTokenRedeemable({ expiresAt: hours(2), consumedAt: hours(-1) }, NOW),
      false,
      "verification links must be single use",
    );
  });

  it("rejects an expired token", () => {
    assert.equal(isTokenRedeemable({ expiresAt: hours(-1), consumedAt: null }, NOW), false);
  });
});

describe("account status gate", () => {
  it("allows an active account", () => {
    assert.ok(canSignIn("active"));
    assert.doesNotThrow(() => assertAccountCanSignIn("active"));
  });

  it("blocks an unverified account", () => {
    assert.equal(canSignIn("pending_verification"), false);
    assert.throws(() => assertAccountCanSignIn("pending_verification"), DomainError);
    assert.throws(() => assertAccountCanSignIn("pending_verification"), /verify your email/i);
  });

  it("blocks a suspended account", () => {
    assert.equal(canSignIn("suspended"), false);
    assert.throws(() => assertAccountCanSignIn("suspended"), /suspended/i);
  });
});
