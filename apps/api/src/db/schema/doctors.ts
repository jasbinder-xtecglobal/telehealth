import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { accountStatus, doctorType, symptomCategory } from "./enums.ts";
import { patients } from "./patients.ts";

export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Stored lowercased and trimmed — the unique index is the login identity. */
  email: text("email").notNull().unique(),

  /* -------- authentication -------- */
  /** scrypt digest as `scrypt$N$r$p$salt$hash`. Never a plaintext password. */
  passwordHash: text("password_hash"),
  status: accountStatus("status").notNull().default("pending_verification"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  /** Reset on success; drives temporary lockout after repeated failures. */
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  /** Name shown to patients on certificates and scripts. */
  chosenName: text("chosen_name"),
  mobile: text("mobile"),
  gender: text("gender"),
  providerNumber: text("provider_number").notNull(),
  prescriberNumber: text("prescriber_number").notNull(),
  doctorType: doctorType("doctor_type").notNull().default("gp_fellow"),
  qualifications: text("qualifications"),
  /** Free-text steer appended to the scribe prompt for this doctor. */
  aiScribePersonalisation: text("ai_scribe_personalisation"),
  digitalSignature: text("digital_signature"),
  prefTelehealth: boolean("pref_telehealth").notNull().default(true),
  prefHomeVisits: boolean("pref_home_visits").notNull().default(false),
  largeFont: boolean("large_font").notNull().default(false),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),

  /** Last known position, used to build and re-sequence home-visit routes. */
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  locationUpdatedAt: timestamp("location_updated_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Presentation categories a doctor has opted out of seeing. */
export const doctorFilters = pgTable(
  "doctor_filters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    category: symptomCategory("category").notNull(),
  },
  (t) => [uniqueIndex("doctor_filter_unq").on(t.doctorId, t.category)],
);

/**
 * Patients a doctor has chosen never to see again.
 * A reason is mandatory — permanent invisibility with no stated cause is a
 * governance risk, not a preference.
 */
export const hiddenPatients = pgTable(
  "hidden_patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("hidden_patient_unq").on(t.doctorId, t.patientId)],
);

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  body: text("body").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
export type Template = typeof templates.$inferSelect;
export type HiddenPatient = typeof hiddenPatients.$inferSelect;
