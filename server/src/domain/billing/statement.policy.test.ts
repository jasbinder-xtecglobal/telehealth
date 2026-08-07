import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStatement,
  isBillingIncomplete,
  isoDate,
  startOfWeek,
  type StatementLine,
} from "./statement.policy.ts";

function line(endedAt: Date, fee: number, id = endedAt.toISOString()): StatementLine {
  return {
    consultId: id,
    patientName: "Test Patient",
    dob: "1990-01-01",
    gender: "female",
    endedAt,
    category: "skin",
    itemNumbers: ["91891"],
    fee,
    billed: true,
  };
}

describe("isBillingIncomplete", () => {
  it("treats a consult with no billing row as incomplete", () => {
    assert.equal(isBillingIncomplete([]), true);
  });

  it("treats a pending claim as incomplete", () => {
    assert.equal(isBillingIncomplete([{ status: "pending" }]), true);
  });

  it("treats a submitted claim as complete", () => {
    assert.equal(isBillingIncomplete([{ status: "submitted" }]), false);
  });

  it("treats a deliberate no-billing decision as complete", () => {
    assert.equal(isBillingIncomplete([{ status: "no_billing" }]), false);
  });

  it("flags a mixed set if any line is still pending", () => {
    assert.equal(
      isBillingIncomplete([{ status: "submitted" }, { status: "pending" }]),
      true,
    );
  });
});

describe("startOfWeek", () => {
  it("returns the same day for a Monday", () => {
    const monday = new Date(2026, 3, 27); // Mon 27 Apr 2026
    assert.equal(isoDate(startOfWeek(monday)), "2026-04-27");
  });

  it("walks a Sunday back to the Monday six days earlier", () => {
    const sunday = new Date(2026, 4, 3); // Sun 3 May 2026
    assert.equal(isoDate(startOfWeek(sunday)), "2026-04-27");
  });

  it("walks a mid-week day back to its Monday", () => {
    const friday = new Date(2026, 4, 1); // Fri 1 May 2026
    assert.equal(isoDate(startOfWeek(friday)), "2026-04-27");
  });

  it("strips the time so two consults on one day share a key", () => {
    const early = startOfWeek(new Date(2026, 3, 29, 2, 15));
    const late = startOfWeek(new Date(2026, 3, 29, 23, 45));
    assert.equal(early.getTime(), late.getTime());
  });
});

describe("isoDate", () => {
  it("uses local time, not UTC", () => {
    // 00:30 local on the 1st is still the 1st, whatever the offset.
    assert.equal(isoDate(new Date(2026, 4, 1, 0, 30)), "2026-05-01");
  });
});

describe("buildStatement", () => {
  it("returns nothing for no lines", () => {
    const s = buildStatement([]);
    assert.deepEqual(s.weeks, []);
    assert.equal(s.consultCount, 0);
    assert.equal(s.total, 0);
  });

  it("groups a Monday-to-Sunday span into one week", () => {
    const s = buildStatement([
      line(new Date(2026, 3, 27, 20, 0), 65.75),
      line(new Date(2026, 4, 3, 22, 0), 65.75),
    ]);
    assert.equal(s.weeks.length, 1);
    assert.equal(s.weeks[0]!.weekStart, "2026-04-27");
    assert.equal(s.weeks[0]!.weekEnd, "2026-05-03");
  });

  it("splits the following Monday into a separate week", () => {
    const s = buildStatement([
      line(new Date(2026, 4, 3, 22, 0), 10),
      line(new Date(2026, 4, 4, 1, 0), 10),
    ]);
    assert.equal(s.weeks.length, 2);
  });

  it("subtotals days and weeks", () => {
    const s = buildStatement([
      line(new Date(2026, 4, 1, 19, 0), 65.75, "a"),
      line(new Date(2026, 4, 1, 21, 0), 65.75, "b"),
      line(new Date(2026, 4, 2, 20, 0), 185.85, "c"),
    ]);
    const week = s.weeks[0]!;
    assert.equal(week.consultCount, 3);
    assert.equal(week.total, 317.35);

    const may2 = week.days.find((d) => d.date === "2026-05-02")!;
    const may1 = week.days.find((d) => d.date === "2026-05-01")!;
    assert.equal(may1.consultCount, 2);
    assert.equal(may1.total, 131.5);
    assert.equal(may2.total, 185.85);
  });

  it("orders weeks, days and lines newest first", () => {
    const s = buildStatement([
      line(new Date(2026, 3, 28, 9, 0), 1, "older-week"),
      line(new Date(2026, 4, 5, 9, 0), 1, "day-1"),
      line(new Date(2026, 4, 6, 9, 0), 1, "day-2"),
      line(new Date(2026, 4, 6, 21, 0), 1, "day-2-late"),
    ]);
    assert.equal(s.weeks[0]!.weekStart, "2026-05-04");
    assert.equal(s.weeks[1]!.weekStart, "2026-04-27");
    assert.equal(s.weeks[0]!.days[0]!.date, "2026-05-06");
    assert.equal(s.weeks[0]!.days[0]!.lines[0]!.consultId, "day-2-late");
  });

  it("keeps float addition from drifting the total", () => {
    const s = buildStatement([
      line(new Date(2026, 4, 1, 10, 0), 0.1, "a"),
      line(new Date(2026, 4, 1, 11, 0), 0.2, "b"),
    ]);
    assert.equal(s.total, 0.3);
    assert.equal(s.weeks[0]!.days[0]!.total, 0.3);
  });

  it("counts an unbilled consult but adds nothing to the total", () => {
    const unbilled: StatementLine = {
      ...line(new Date(2026, 4, 1, 10, 0), 0, "no-bill"),
      itemNumbers: [],
      billed: false,
    };
    const s = buildStatement([unbilled, line(new Date(2026, 4, 1, 12, 0), 65.75)]);
    assert.equal(s.consultCount, 2);
    assert.equal(s.total, 65.75);
  });
});
