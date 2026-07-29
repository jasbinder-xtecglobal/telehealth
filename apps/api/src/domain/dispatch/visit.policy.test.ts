import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../errors.ts";
import {
  assertVisitTransition,
  canTransition,
  DEFAULT_THRESHOLDS,
  evaluateVisitSafety,
  visitsNeedingEscalation,
} from "./visit.policy.ts";

const NOW = new Date("2026-07-28T20:00:00Z");
const minsBefore = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe("visit state machine", () => {
  it("follows the dispatch happy path", () => {
    assert.ok(canTransition("unassigned", "offered"));
    assert.ok(canTransition("offered", "accepted"));
    assert.ok(canTransition("accepted", "en_route"));
    assert.ok(canTransition("en_route", "on_scene"));
    assert.ok(canTransition("on_scene", "completed"));
  });

  it("lets a doctor self-assign straight off the board", () => {
    assert.ok(
      canTransition("unassigned", "accepted"),
      "a doctor picking up an unoffered job is a normal path, not an error",
    );
  });

  it("refuses to skip arrival", () => {
    assert.equal(canTransition("accepted", "on_scene"), false);
    assert.equal(canTransition("en_route", "completed"), false);
  });

  it("refuses to reopen a completed visit", () => {
    assert.equal(canTransition("completed", "on_scene"), false);
    assert.throws(() => assertVisitTransition("completed", "on_scene"), DomainError);
  });

  it("returns a declined visit to the pool", () => {
    assert.ok(canTransition("declined", "unassigned"));
    assert.ok(canTransition("declined", "offered"));
  });

  it("refuses to decline once on scene", () => {
    assert.equal(canTransition("on_scene", "declined"), false);
  });
});

describe("lone-worker safety", () => {
  const onScene = (minutes: number) => ({
    status: "on_scene" as const,
    enRouteAt: minsBefore(minutes + 10),
    arrivedAt: minsBefore(minutes),
    departedAt: null,
  });

  it("is quiet during a normal visit", () => {
    const s = evaluateVisitSafety(onScene(15), NOW);
    assert.equal(s.level, "ok");
    assert.equal(s.minutesOnScene, 15);
    assert.equal(s.requiresEscalation, false);
  });

  it("prompts a check-out once the visit runs long", () => {
    const s = evaluateVisitSafety(onScene(DEFAULT_THRESHOLDS.checkOutDueMinutes), NOW);
    assert.equal(s.level, "overdue");
    assert.equal(s.requiresEscalation, false);
    assert.match(s.message, /Check out/);
  });

  it("escalates on its own past the threshold", () => {
    const s = evaluateVisitSafety(
      onScene(DEFAULT_THRESHOLDS.escalateAfterMinutes + 5),
      NOW,
    );
    assert.equal(s.level, "escalate");
    assert.equal(
      s.requiresEscalation,
      true,
      "a doctor who cannot press a button must still trigger an alert",
    );
  });

  it("stops the timer once the doctor checks out", () => {
    const s = evaluateVisitSafety(
      {
        status: "completed",
        enRouteAt: minsBefore(120),
        arrivedAt: minsBefore(90),
        departedAt: minsBefore(30),
      },
      NOW,
    );
    assert.equal(s.level, "ok");
    assert.equal(s.requiresEscalation, false);
  });

  it("flags a doctor who has been en route too long", () => {
    const s = evaluateVisitSafety(
      {
        status: "en_route",
        enRouteAt: minsBefore(DEFAULT_THRESHOLDS.enRouteStaleMinutes + 1),
        arrivedAt: null,
        departedAt: null,
      },
      NOW,
    );
    assert.equal(s.level, "due");
    assert.match(s.message, /without arriving/);
  });

  it("stays quiet for a visit that has not started", () => {
    const s = evaluateVisitSafety(
      { status: "offered", enRouteAt: null, arrivedAt: null, departedAt: null },
      NOW,
    );
    assert.equal(s.level, "ok");
  });

  it("respects custom thresholds", () => {
    const s = evaluateVisitSafety(onScene(20), NOW, {
      checkOutDueMinutes: 10,
      escalateAfterMinutes: 15,
      enRouteStaleMinutes: 30,
    });
    assert.equal(s.level, "escalate");
  });
});

describe("automatic escalation sweep", () => {
  it("selects only the visits that have breached", () => {
    const visits = [
      { id: "safe", status: "on_scene" as const, enRouteAt: null, arrivedAt: minsBefore(10), departedAt: null },
      { id: "breached", status: "on_scene" as const, enRouteAt: null, arrivedAt: minsBefore(90), departedAt: null },
      { id: "done", status: "completed" as const, enRouteAt: null, arrivedAt: minsBefore(200), departedAt: minsBefore(150) },
    ];

    const flagged = visitsNeedingEscalation(visits, NOW);
    assert.deepEqual(flagged.map((v) => v.id), ["breached"]);
  });
});
