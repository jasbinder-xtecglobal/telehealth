import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { doctors } from "./doctors.ts";
import {
  consultChannel,
  consultPreference,
  consultStatus,
  symptomCategory,
} from "./enums.ts";
import { patients } from "./patients.ts";

export const consults = pgTable("consults", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "restrict" }),
  doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),

  channel: consultChannel("channel").notNull().default("telehealth"),
  status: consultStatus("status").notNull().default("queued"),
  preference: consultPreference("preference").notNull().default("phone"),

  symptomCategory: symptomCategory("symptom_category").notNull(),
  /** The patient's own words, as typed at booking. */
  additionalInfo: text("additional_info"),

  /** 1 (most urgent) – 5. Drives queue ordering ahead of raw wait time. */
  acuity: integer("acuity").notNull().default(4),

  /** Consult generated mid-consult for a family member — visible only to its author. */
  privateToDoctorId: uuid("private_to_doctor_id").references(() => doctors.id, {
    onDelete: "set null",
  }),

  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),

  /** Working copy. Every change also appends a row to note_revisions. */
  notes: text("notes"),
  /** Set only when the doctor signs off. The close transaction requires it. */
  notesAttestedAt: timestamp("notes_attested_at", { withTimezone: true }),

  requeueCount: integer("requeue_count").notNull().default(0),
  rejectionReason: text("rejection_reason"),
  patientJoinedAt: timestamp("patient_joined_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Append-only note history. Clinical notes must never be silently editable —
 * every version is retained with its author and whether AI drafted it.
 */
export const noteRevisions = pgTable("note_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultId: uuid("consult_id")
    .notNull()
    .references(() => consults.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => doctors.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  /** Model identifier, retained so an AI-drafted note stays reproducible. */
  aiModel: text("ai_model"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Evidence base for anything the scribe wrote. */
export const consultTranscripts = pgTable("consult_transcripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultId: uuid("consult_id")
    .notNull()
    .references(() => consults.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  /** Patient consent to recording — no consent, no scribe. */
  consentGiven: boolean("consent_given").notNull().default(false),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Consult = typeof consults.$inferSelect;
export type NewConsult = typeof consults.$inferInsert;
export type NoteRevision = typeof noteRevisions.$inferSelect;
export type ConsultTranscript = typeof consultTranscripts.$inferSelect;
