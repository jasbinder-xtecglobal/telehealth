/**
 * Real-time call sessions.
 *
 * One row per attempt to put a doctor and a patient on the same call, whichever
 * vendor carried it. The table is deliberately vendor-neutral: `provider` and
 * `roomName` are the only vendor-shaped columns, and nothing else in the
 * codebase branches on the provider value.
 *
 * This is the record that answers "which vendor did we actually use, how often,
 * and for how long" while the four candidates are being compared — so it is
 * written even when the call fails to connect.
 *
 * It holds no clinical content. Media is never recorded here; the consult
 * transcript, and the consent that gates it, stay in `consult_transcripts`.
 */
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { consults } from "./consults.ts";
import { doctors } from "./doctors.ts";
import { callMode, callProvider } from "./enums.ts";

export const callSessions = pgTable("call_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultId: uuid("consult_id")
    .notNull()
    .references(() => consults.id, { onDelete: "cascade" }),

  provider: callProvider("provider").notNull(),
  mode: callMode("mode").notNull(),

  /** The vendor's room identifier. Opaque to everything above the adapter. */
  roomName: text("room_name").notNull(),

  /** Follow-up and audit sit with the doctor who opened the call. */
  startedByDoctorId: uuid("started_by_doctor_id").references(() => doctors.id, {
    onDelete: "set null",
  }),

  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  /** Null while the call is live. Set once, on end. */
  endedAt: timestamp("ended_at", { withTimezone: true }),
  /** Why it ended — "doctor_ended", "consult_closed". Free text by design; the
   *  set of reasons will change as vendors are swapped. */
  endedReason: text("ended_reason"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CallSession = typeof callSessions.$inferSelect;
export type NewCallSession = typeof callSessions.$inferInsert;
