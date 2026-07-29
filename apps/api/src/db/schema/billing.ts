import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { consults } from "./consults.ts";
import { doctors } from "./doctors.ts";
import { billingStatus } from "./enums.ts";

export const billings = pgTable("billings", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultId: uuid("consult_id")
    .notNull()
    .references(() => consults.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
  itemNumber: text("item_number"),
  description: text("description"),
  fee: numeric("fee", { precision: 10, scale: 2 }).notNull().default("0"),
  status: billingStatus("status").notNull().default("pending"),
  /** Populated when a claim comes back rejected — drives the correction queue. */
  rejectionReason: text("rejection_reason"),
  noBillingReason: text("no_billing_reason"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Billing = typeof billings.$inferSelect;
