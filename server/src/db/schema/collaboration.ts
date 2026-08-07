import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { doctors } from "./doctors.ts";
import { chatChannel } from "./enums.ts";

/**
 * Clinical and dispatcher chat.
 *
 * Note: clinical discussion of patients forms part of the health record, so a
 * production build needs a retention policy on this table.
 */
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  channel: chatChannel("channel").notNull(),
  authorId: uuid("author_id").references(() => doctors.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
