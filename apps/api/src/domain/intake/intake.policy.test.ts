import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOOKING_REASONS,
  bookingAcuity,
  categoryForReason,
  checkBooking,
  reasonLabel,
} from "./intake.policy.ts";

const NOW = new Date(2026, 7, 3);

function booking(over: Partial<Parameters<typeof checkBooking>[0]> = {}) {
  return checkBooking({
    firstName: "Emma",
    lastName: "Robertson",
    dob: "1989-04-15",
    phone: "0412 345 678",
    symptoms: "Burning when passing urine since yesterday",
    emergencyCleared: true,
    now: NOW,
    ...over,
  });
}

describe("booking reasons", () => {
  it("has a unique value for every reason", () => {
    const values = BOOKING_REASONS.map((r) => r.value);
    assert.equal(new Set(values).size, values.length);
  });

  it("maps every reason onto exactly one category", () => {
    for (const r of BOOKING_REASONS) {
      assert.equal(categoryForReason(r.value), r.category);
    }
  });

  it("returns the patient-facing label", () => {
    assert.equal(reasonLabel("certificate"), "Medical Certificate");
  });

  it("covers every category a doctor can filter out", () => {
    // A doctor can opt out of these; if no booking reason maps to one, the
    // filter silently does nothing.
    const filterable = [
      "mens_health",
      "womens_health",
      "prescribed_weight_loss",
      "medical_certificate_only",
    ];
    const reachable = new Set(BOOKING_REASONS.map((r) => r.category));
    for (const c of filterable) assert.ok(reachable.has(c as never), c);
  });
});

describe("bookingAcuity", () => {
  it("puts a certificate request last whatever the pain score", () => {
    assert.equal(bookingAcuity({ reason: "certificate", painLevel: 10 }), 5);
  });

  it("raises severe pain to acuity 2", () => {
    assert.equal(bookingAcuity({ reason: "gut", painLevel: 8 }), 2);
    assert.equal(bookingAcuity({ reason: "gut", painLevel: 10 }), 2);
  });

  it("never reaches acuity 1 from a self-report", () => {
    for (let pain = 1; pain <= 10; pain++) {
      for (const r of BOOKING_REASONS) {
        assert.notEqual(bookingAcuity({ reason: r.value, painLevel: pain }), 1);
      }
    }
  });

  it("treats moderate pain as acuity 3", () => {
    assert.equal(bookingAcuity({ reason: "skin", painLevel: 5 }), 3);
    assert.equal(bookingAcuity({ reason: "skin", painLevel: 7 }), 3);
  });

  it("defaults to routine when no pain score was given", () => {
    assert.equal(bookingAcuity({ reason: "general", painLevel: null }), 4);
  });
});

describe("checkBooking", () => {
  it("accepts a complete booking", () => {
    assert.deepEqual(booking(), []);
  });

  it("rejects a missing name", () => {
    assert.ok(booking({ firstName: "   " }).includes("missing_name"));
  });

  it("rejects a date of birth in the future", () => {
    assert.ok(booking({ dob: "2027-01-01" }).includes("future_dob"));
  });

  it("rejects an unparseable date of birth", () => {
    assert.ok(booking({ dob: "not-a-date" }).includes("missing_dob"));
  });

  it("accepts a phone number whatever the formatting", () => {
    assert.deepEqual(booking({ phone: "+61 412 345 678" }), []);
    assert.deepEqual(booking({ phone: "0412345678" }), []);
  });

  it("rejects a phone number too short to call", () => {
    assert.ok(booking({ phone: "0412" }).includes("missing_phone"));
  });

  it("rejects an empty symptom description", () => {
    assert.ok(booking({ symptoms: "  " }).includes("missing_symptoms"));
  });

  it("refuses to queue a booking the emergency check did not clear", () => {
    assert.ok(
      booking({ emergencyCleared: false }).includes("emergency_not_cleared"),
    );
  });

  it("reports every problem at once rather than the first", () => {
    const problems = booking({
      firstName: "",
      lastName: "",
      phone: "1",
      symptoms: "",
    });
    assert.ok(problems.includes("missing_name"));
    assert.ok(problems.includes("missing_phone"));
    assert.ok(problems.includes("missing_symptoms"));
  });
});
