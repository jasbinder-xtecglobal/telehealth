/**
 * Clinical artefacts produced during a consult.
 *
 * All are created as drafts and released together when the consult closes —
 * nothing here reaches the patient before that transaction commits.
 */
import {
  boolean,
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
  artefactStatus,
  documentType,
  investigationStatus,
  investigationType,
  prescriptionType,
  referralType,
} from "./enums.ts";
import { drugs } from "./reference.ts";

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultId: uuid("consult_id")
    .notNull()
    .references(() => consults.id, { onDelete: "cascade" }),
  drugId: uuid("drug_id").references(() => drugs.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  activeIngredient: text("active_ingredient").notNull(),
  strength: text("strength"),
  form: text("form"),
  quantity: integer("quantity").notNull(),
  repeats: integer("repeats").notNull().default(0),
  directions: text("directions"),
  type: prescriptionType("type").notNull().default("pbs"),
  pbsCode: text("pbs_code"),
  streamlineCode: text("streamline_code"),
  /** eScript token — becomes the QR the patient presents at a pharmacy. */
  escriptToken: text("escript_token"),
  status: artefactStatus("status").notNull().default("draft"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultId: uuid("consult_id")
    .notNull()
    .references(() => consults.id, { onDelete: "cascade" }),
  type: referralType("type").notNull(),
  recipient: text("recipient").notNull(),
  body: text("body").notNull(),
  status: artefactStatus("status").notNull().default("draft"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const investigations = pgTable("investigations", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultId: uuid("consult_id")
    .notNull()
    .references(() => consults.id, { onDelete: "cascade" }),
  type: investigationType("type").notNull(),
  tests: text("tests").notNull(),
  clinicalNotes: text("clinical_notes"),
  copyToGp: boolean("copy_to_gp").notNull().default(false),
  status: investigationStatus("status").notNull().default("ordered"),
  /** The ordering doctor owns follow-up — this drives their inbox. */
  orderedByDoctorId: uuid("ordered_by_doctor_id").references(() => doctors.id, {
    onDelete: "set null",
  }),
  resultBody: text("result_body"),
  isAbnormal: boolean("is_abnormal").notNull().default(false),
  resultedAt: timestamp("resulted_at", { withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultId: uuid("consult_id")
    .notNull()
    .references(() => consults.id, { onDelete: "cascade" }),
  type: documentType("type").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  body: text("body"),
  status: artefactStatus("status").notNull().default("draft"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Prescription = typeof prescriptions.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type Investigation = typeof investigations.$inferSelect;
export type ClinicalDocument = typeof documents.$inferSelect;
