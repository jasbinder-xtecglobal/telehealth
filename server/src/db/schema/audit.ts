import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { doctors } from "./doctors.ts";

/**
 * Append-only audit trail. Never updated, never deleted.
 *
 * Writes go through AuditRepository so no caller can accidentally mutate a
 * prior event.
 */
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => doctors.id, { onDelete: "set null" }),
  actorName: text("actor_name"),
  /** e.g. consult.claimed, consult.closed, prescription.issued */
  eventType: text("event_type").notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditEvent = typeof auditEvents.$inferSelect;
