/**
 * Public booking rules.
 *
 * A stranger on the website describes their problem in their own words. This
 * module turns that into the two things the queue needs — a symptom category
 * and a triage acuity — and nothing else. It is pure so both the booking
 * endpoint and its tests agree on exactly one answer.
 *
 * What it deliberately does not do: decide clinical severity. `bookingAcuity`
 * orders a queue. It is not a validated triage instrument, and a real service
 * needs one (ATS or similar) with a human in the loop.
 */
import type { SymptomCategory } from "../../db/schema/enums.ts";

/**
 * The reasons offered on the booking form.
 *
 * Every entry maps onto exactly one domain category, so nothing is lost
 * between what the patient picked and what the doctor's queue filters on.
 * Adding a patient-facing reason means adding it here, not in the web app.
 */
export const BOOKING_REASONS = [
  { value: "general", label: "General Consultation", category: "other_issues" },
  { value: "cold_flu", label: "Cold & Flu", category: "other_issues" },
  { value: "gut", label: "Stomach or Gut Problem", category: "gut_related" },
  { value: "skin", label: "Skin Issue", category: "skin" },
  {
    value: "mental_health",
    label: "Mental Health, Sleep or Headache",
    category: "mental_health_sleep_headache",
  },
  { value: "womens_health", label: "Women's Health", category: "womens_health" },
  { value: "mens_health", label: "Men's Health", category: "mens_health" },
  {
    value: "prescription",
    label: "Prescription Renewal",
    category: "other_issues",
  },
  {
    value: "weight_loss",
    label: "Prescribed Weight Loss",
    category: "prescribed_weight_loss",
  },
  {
    value: "certificate",
    label: "Medical Certificate",
    category: "medical_certificate_only",
  },
  { value: "other", label: "Other", category: "other_issues" },
] as const satisfies readonly {
  value: string;
  label: string;
  category: SymptomCategory;
}[];

export type BookingReason = (typeof BOOKING_REASONS)[number]["value"];

export const BOOKING_REASON_VALUES = BOOKING_REASONS.map((r) => r.value) as [
  BookingReason,
  ...BookingReason[],
];

export function reasonLabel(reason: BookingReason): string {
  return BOOKING_REASONS.find((r) => r.value === reason)!.label;
}

export function categoryForReason(reason: BookingReason): SymptomCategory {
  return BOOKING_REASONS.find((r) => r.value === reason)!.category;
}

/**
 * Where a new booking sits in the queue. 1 is most urgent.
 *
 * Self-reported pain drives it, with two corrections:
 *   - a certificate-only request is never urgent, whatever the patient scored
 *   - a high pain score cannot reach acuity 1, because acuity 1 is a doctor's
 *     judgement. A patient who is genuinely that unwell is told to call 000
 *     by the emergency check before they ever reach this form.
 */
export function bookingAcuity(input: {
  reason: BookingReason;
  painLevel: number | null;
}): number {
  if (categoryForReason(input.reason) === "medical_certificate_only") return 5;

  const pain = input.painLevel ?? 0;
  if (pain >= 8) return 2;
  if (pain >= 5) return 3;
  return 4;
}

/**
 * Whether a booking carries enough to be safely queued.
 *
 * Returned as data, not thrown, so the website can render the same list of
 * problems next to the fields that caused them.
 */
export type BookingProblem =
  | "missing_name"
  | "missing_dob"
  | "future_dob"
  | "missing_phone"
  | "missing_symptoms"
  | "emergency_not_cleared";

export function checkBooking(input: {
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  symptoms: string;
  emergencyCleared: boolean;
  now: Date;
}): BookingProblem[] {
  const problems: BookingProblem[] = [];

  if (!input.firstName.trim() || !input.lastName.trim()) {
    problems.push("missing_name");
  }

  const dob = new Date(`${input.dob}T00:00:00`);
  if (!input.dob || Number.isNaN(dob.getTime())) problems.push("missing_dob");
  else if (dob > input.now) problems.push("future_dob");

  // Digits only — the queue rings this number, so formatting is irrelevant but
  // length is not.
  if (input.phone.replace(/\D/g, "").length < 8) problems.push("missing_phone");

  if (input.symptoms.trim().length < 3) problems.push("missing_symptoms");

  // The website asks "is this an emergency?" first and routes a yes to 000.
  // The server does not take that on trust.
  if (!input.emergencyCleared) problems.push("emergency_not_cleared");

  return problems;
}
