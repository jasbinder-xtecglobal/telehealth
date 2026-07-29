import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { consultChannel } from "./enums.ts";

/**
 * Drug reference data. In production this is a licensed feed (MIMS or AMT);
 * here it is a seeded table with the same shape.
 */
export const drugs = pgTable("drugs", {
  id: uuid("id").primaryKey().defaultRandom(),
  activeIngredient: text("active_ingredient").notNull(),
  productName: text("product_name").notNull(),
  strength: text("strength"),
  form: text("form"),
  defaultPackSize: integer("default_pack_size").notNull().default(1),
  suggestedDose: text("suggested_dose"),
  pbsCode: text("pbs_code"),
  isStreamlined: boolean("is_streamlined").notNull().default(false),
  streamlineCode: text("streamline_code"),
  /** Human-readable PBS criteria shown before a streamlined item is used. */
  restrictionCriteria: text("restriction_criteria"),
  /** Ingredients that contraindicate — checked against patient_allergies. */
  contraindicatedWith: jsonb("contraindicated_with").$type<string[]>().default([]),
  /** Ingredients this interacts with — checked against active scripts. */
  interactsWith: jsonb("interacts_with").$type<string[]>().default([]),
  /** Subject to real-time prescription monitoring. */
  isMonitored: boolean("is_monitored").notNull().default(false),
});

/** MBS items available to select at close. */
export const mbsItems = pgTable("mbs_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemNumber: text("item_number").notNull().unique(),
  description: text("description").notNull(),
  fee: numeric("fee", { precision: 10, scale: 2 }).notNull(),
  /** Doctor types permitted to claim it. */
  appliesTo: jsonb("applies_to").$type<string[]>().notNull(),
  channel: consultChannel("channel"),
  afterHoursOnly: boolean("after_hours_only").notNull().default(true),
  minMinutes: integer("min_minutes"),
  maxMinutes: integer("max_minutes"),
});

export type Drug = typeof drugs.$inferSelect;
export type MbsItem = typeof mbsItems.$inferSelect;
