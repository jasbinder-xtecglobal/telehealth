import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../errors.ts";
import {
  assertClosable,
  assertOwnedBy,
  assertTransition,
  canTransition,
  durationMinutes,
  evaluateCloseGates,
  isClaimable,
} from "./consult.policy.ts";

describe("consult state machine", () => {
  it("allows a queued consult to be claimed", () => {
    assert.equal(canTransition("queued", "claimed"), true);
    assert.equal(canTransition("requeued", "claimed"), true);
  });

  it("refuses to reopen a closed consult", () => {
    assert.equal(canTransition("closed", "in_consult"), false);
    assert.throws(() => assertTransition("closed", "in_consult"), DomainError);
  });

  it("refuses to skip straight from queued to closed", () => {
    assert.equal(canTransition("queued", "closed"), false);
  });

  it("treats only queued and requeued as claimable", () => {
    assert.equal(isClaimable("queued"), true);
    assert.equal(isClaimable("requeued"), true);
    assert.equal(isClaimable("in_consult"), false);
    assert.equal(isClaimable("closed"), false);
  });
});

describe("ownership", () => {
  it("rejects a doctor acting on someone else's consult", () => {
    assert.throws(() => assertOwnedBy({ doctorId: "other" }, "me"), DomainError);
  });

  it("permits the assigned doctor", () => {
    assert.doesNotThrow(() => assertOwnedBy({ doctorId: "me" }, "me"));
  });
});

describe("close gates", () => {
  const complete = {
    status: "in_consult" as const,
    notes: "PC - Diarrhoea",
    notesAttestedAt: new Date(),
    billingCount: 1,
  };

  it("passes when every condition is met", () => {
    assert.ok(evaluateCloseGates(complete).every((g) => g.satisfied));
    assert.doesNotThrow(() => assertClosable(complete));
  });

  it("blocks a consult with no notes", () => {
    assert.throws(() => assertClosable({ ...complete, notes: "   " }), DomainError);
  });

  it("blocks a consult whose notes are not attested", () => {
    assert.throws(
      () => assertClosable({ ...complete, notesAttestedAt: null }),
      /attested/i,
    );
  });

  it("blocks a consult with no billing decision", () => {
    assert.throws(() => assertClosable({ ...complete, billingCount: 0 }), /billing/i);
  });

  it("reports which gate failed", () => {
    const gates = evaluateCloseGates({ ...complete, billingCount: 0 });
    const failed = gates.filter((g) => !g.satisfied).map((g) => g.key);
    assert.deepEqual(failed, ["billing"]);
  });
});

describe("duration", () => {
  it("measures from the start time when present", () => {
    const started = new Date("2026-07-28T10:00:00Z");
    const now = new Date("2026-07-28T10:12:00Z");
    assert.equal(
      durationMinutes({ startedAt: started, claimedAt: null, requestedAt: started }, now),
      12,
    );
  });

  it("falls back to claim time, then request time", () => {
    const claimed = new Date("2026-07-28T10:00:00Z");
    const now = new Date("2026-07-28T10:07:00Z");
    assert.equal(
      durationMinutes({ startedAt: null, claimedAt: claimed, requestedAt: claimed }, now),
      7,
    );
  });

  it("never reports less than one minute", () => {
    const t = new Date("2026-07-28T10:00:00Z");
    assert.equal(durationMinutes({ startedAt: t, claimedAt: null, requestedAt: t }, t), 1);
  });
});
