/**
 * Home-visit dispatch.
 *
 * A `visit` is the logistics half of a home-visit consult: who is going, in
 * what order, and — critically — whether they arrived and left safely. It is
 * kept separate from `consults` so the clinical record is not entangled with
 * routing state.
 */
import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { consults } from "./consults.ts";
import { doctors } from "./doctors.ts";

export const visitStatus = pgEnum("visit_status", [
  "unassigned",
  "offered",
  "accepted",
  "en_route",
  "on_scene",
  "completed",
  "declined",
]);

export type VisitStatus = (typeof visitStatus.enumValues)[number];

export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    consultId: uuid("consult_id")
      .notNull()
      .references(() => consults.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").references(() => doctors.id, {
      onDelete: "set null",
    }),

    status: visitStatus("status").notNull().default("unassigned"),

    /** Position in the doctor's optimised run. Null until a route is built. */
    routeOrder: integer("route_order"),
    distanceKm: numeric("distance_km", { precision: 8, scale: 2 }),
    etaMinutes: integer("eta_minutes"),

    offeredAt: timestamp("offered_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    enRouteAt: timestamp("en_route_at", { withTimezone: true }),
    /** Check-in. Starts the lone-worker timer. */
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    /** Check-out. Stops it. A missing check-out is what escalates. */
    departedAt: timestamp("departed_at", { withTimezone: true }),

    declineReason: text("decline_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("visit_consult_unq").on(t.consultId)],
);

/**
 * Lone-worker alerts.
 *
 * Raised either by the doctor pressing the panic button, or automatically when
 * an on-scene visit passes its escalation threshold without a check-out.
 */
export const duressAlerts = pgTable("duress_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  visitId: uuid("visit_id").references(() => visits.id, { onDelete: "set null" }),
  /** panic | overdue_checkout */
  source: text("source").notNull(),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  note: text("note"),
  raisedAt: timestamp("raised_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by"),
});

export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type DuressAlert = typeof duressAlerts.$inferSelect;
