/**
 * Authentication state.
 *
 * Sessions and verification tokens are stored **hashed**. The raw value exists
 * only in the cookie or the emailed link — a database dump therefore cannot be
 * replayed to impersonate a doctor.
 */
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { doctors } from "./doctors.ts";

export type { AccountStatus } from "./enums.ts";

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  /** SHA-256 of the opaque token. The raw token is never stored. */
  tokenHash: text("token_hash").notNull().unique(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  /** Set on logout so the row survives for audit rather than being deleted. */
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  /** Single use — set the moment it is redeemed. */
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Session = typeof sessions.$inferSelect;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
