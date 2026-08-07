import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SymptomCategory } from "../../db/schema/enums.ts";
import { buildQueue, compareByPriority, isVisibleTo, type QueueCandidate } from "./queue.policy.ts";

const NOW = new Date("2026-07-28T12:00:00Z");

function candidate(over: Partial<QueueCandidate> & { id: string }): QueueCandidate {
  return {
    patientId: `p-${over.id}`,
    symptomCategory: "other_issues" as SymptomCategory,
    acuity: 4,
    requestedAt: new Date("2026-07-28T11:00:00Z"),
    privateToDoctorId: null,
    preference: "phone",
    additionalInfo: null,
    patient: {
      firstName: "Test",
      lastName: over.id.toUpperCase(),
      dob: "1990-01-01",
      gender: "Unspecified",
      state: "VIC",
      concessionCard: false,
      familyGroupId: null,
    },
    ...over,
  } as QueueCandidate;
}

const visibility = {
  doctorId: "dr-1",
  excludedCategories: [] as SymptomCategory[],
  hiddenPatientIds: [] as string[],
};

describe("visibility", () => {
  it("hides a filtered category", () => {
    const c = candidate({ id: "a", symptomCategory: "mens_health" });
    assert.equal(
      isVisibleTo(c, { ...visibility, excludedCategories: ["mens_health"] }),
      false,
    );
  });

  it("hides a patient the doctor has hidden", () => {
    const c = candidate({ id: "a" });
    assert.equal(
      isVisibleTo(c, { ...visibility, hiddenPatientIds: [c.patientId] }),
      false,
    );
  });

  it("hides a consult private to another doctor", () => {
    const c = candidate({ id: "a", privateToDoctorId: "dr-2" });
    assert.equal(isVisibleTo(c, visibility), false);
  });

  it("shows a consult private to this doctor", () => {
    const c = candidate({ id: "a", privateToDoctorId: "dr-1" });
    assert.equal(isVisibleTo(c, visibility), true);
  });
});

describe("ordering", () => {
  it("puts higher acuity first even when it has waited less", () => {
    const urgent = candidate({
      id: "urgent",
      acuity: 1,
      requestedAt: new Date("2026-07-28T11:55:00Z"),
    });
    const routine = candidate({
      id: "routine",
      acuity: 4,
      requestedAt: new Date("2026-07-28T10:00:00Z"),
    });

    const ordered = [routine, urgent].sort(compareByPriority);
    assert.equal(ordered[0]!.id, "urgent");
  });

  it("falls back to wait time within the same acuity", () => {
    const older = candidate({
      id: "older",
      requestedAt: new Date("2026-07-28T10:00:00Z"),
    });
    const newer = candidate({
      id: "newer",
      requestedAt: new Date("2026-07-28T11:30:00Z"),
    });

    const ordered = [newer, older].sort(compareByPriority);
    assert.equal(ordered[0]!.id, "older");
  });
});

describe("family grouping", () => {
  it("collapses a household into a single entry", () => {
    const parent = candidate({ id: "parent" });
    parent.patient.familyGroupId = "fam-1";
    parent.patient.firstName = "David";

    const child = candidate({ id: "child" });
    child.patient.familyGroupId = "fam-1";
    child.patient.firstName = "Child";

    const queue = buildQueue([parent, child], visibility, NOW);

    assert.equal(queue.length, 1);
    assert.equal(queue[0]!.familyMembers.length, 1);
    assert.match(queue[0]!.familyMembers[0]!.name, /Child/);
  });

  it("leaves unrelated patients as separate entries", () => {
    const queue = buildQueue(
      [candidate({ id: "a" }), candidate({ id: "b" })],
      visibility,
      NOW,
    );
    assert.equal(queue.length, 2);
  });

  it("computes age from date of birth", () => {
    const c = candidate({ id: "a" });
    c.patient.dob = "1990-06-15";
    const queue = buildQueue([c], visibility, NOW);
    assert.equal(queue[0]!.age, 36);
  });
});
