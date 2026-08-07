import {
  boolean,
  date,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { auStateEnum } from "./enums.ts";

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dob: date("dob").notNull(),
  gender: text("gender"),
  phone: text("phone").notNull(),
  email: text("email"),
  addressLine: text("address_line"),
  suburb: text("suburb"),
  state: auStateEnum("state"),
  postcode: text("postcode"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  medicareNumber: text("medicare_number"),
  medicareIrn: text("medicare_irn"),
  concessionCard: boolean("concession_card").notNull().default(false),
  dvaNumber: text("dva_number"),
  /** Groups patients booked together so they are claimed as one unit. */
  familyGroupId: uuid("family_group_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Coded allergies — deliberately not a free-text field on `patients`.
 * Interaction checking cannot run against prose, and retrofitting structure
 * later means re-collecting every record.
 */
export const patientAllergies = pgTable("patient_allergies", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  /** Matches drugs.activeIngredient so prescribing can cross-check. */
  substance: text("substance").notNull(),
  reaction: text("reaction"),
  severity: text("severity"),
  /** true = explicitly recorded "no known drug allergies". */
  isNkda: boolean("is_nkda").notNull().default(false),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type PatientAllergy = typeof patientAllergies.$inferSelect;
