/**
 * Public intake.
 *
 * Everything here arrives from an unauthenticated stranger on the public
 * website, so it is kept apart from the clinical tables on purpose. A
 * patient's typed "Penicillin" is a claim, not a coded allergy (invariant 7),
 * and their pain score is a prompt for triage, not a diagnosis. The doctor
 * reads this, then records the clinical version themselves.
 */
import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { consults } from "./consults.ts";
import { doctors } from "./doctors.ts";
import {
  applicationStatus,
  contactMethod,
  employmentPreference,
} from "./enums.ts";

/**
 * What the patient typed into the booking form, kept verbatim.
 *
 * One row per consult. Never read by prescribing or interaction checking —
 * those run on coded data only.
 */
export const consultIntake = pgTable("consult_intake", {
  consultId: uuid("consult_id")
    .primaryKey()
    .references(() => consults.id, { onDelete: "cascade" }),

  email: text("email"),
  preferredContact: contactMethod("preferred_contact").notNull().default("phone"),

  /** The patient-facing label they chose, before it was mapped to a category. */
  reasonLabel: text("reason_label").notNull(),
  symptomsStartedOn: date("symptoms_started_on"),
  /** Self-reported 1–10. Feeds triage; it is not a clinical severity score. */
  painLevel: integer("pain_level"),

  reportedMedications: text("reported_medications"),
  /** Free text by necessity. Must be coded by the doctor before prescribing. */
  reportedAllergies: text("reported_allergies"),
  reportedConditions: text("reported_conditions"),

  preferredDoctor: text("preferred_doctor"),
  preferredTime: text("preferred_time"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A doctor's expression of interest from the public site.
 *
 * Deliberately not a `doctors` row: an applicant has not been credentialed,
 * has no provider number on file and must never hold a session. The operator
 * creates the account after recruitment and contracting.
 */
export const doctorApplications = pgTable("doctor_applications", {
  id: uuid("id").primaryKey().defaultRandom(),

  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),

  /** As typed. Verifying it against the AHPRA register is a manual step. */
  ahpraNumber: text("ahpra_number").notNull(),
  yearsExperience: text("years_experience").notNull(),
  specialty: text("specialty").notNull(),
  employment: employmentPreference("employment").notNull(),
  coverLetter: text("cover_letter"),

  status: applicationStatus("status").notNull().default("submitted"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedByDoctorId: uuid("reviewed_by_doctor_id").references(() => doctors.id, {
    onDelete: "set null",
  }),
  reviewNote: text("review_note"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ConsultIntake = typeof consultIntake.$inferSelect;
export type NewConsultIntake = typeof consultIntake.$inferInsert;
export type DoctorApplication = typeof doctorApplications.$inferSelect;
export type NewDoctorApplication = typeof doctorApplications.$inferInsert;
