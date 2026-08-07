/**
 * Input schemas shared across routers.
 *
 * Kept together so validation rules are defined once and the routers stay
 * declarative.
 */
import { z } from "zod";
import {
  callMode,
  callProvider,
  chatChannel,
  consultChannel,
  documentType,
  investigationType,
  prescriptionType,
  referralType,
  symptomCategory,
} from "../db/schema/enums.ts";

export const uuid = z.string().uuid();

export const consultIdInput = z.object({ consultId: uuid });

export const channelInput = z.object({
  channel: z.enum(consultChannel.enumValues),
});

export const chatChannelSchema = z.enum(chatChannel.enumValues);

/** Validated against the enum, so a vendor added to the schema is accepted
 *  without touching the router — and one removed is rejected at the boundary. */
export const callModeSchema = z.enum(callMode.enumValues);
export const callProviderSchema = z.enum(callProvider.enumValues);
export const categorySchema = z.enum(symptomCategory.enumValues);

export const reasonSchema = z
  .string()
  .trim()
  .min(3, "A reason of at least 3 characters is required")
  .max(500);

export const prescribeInput = consultIdInput.extend({
  drugId: uuid,
  quantity: z.number().int().positive().max(1000),
  repeats: z.number().int().min(0).max(5),
  directions: z.string().trim().min(1).max(500),
  type: z.enum(prescriptionType.enumValues),
  streamlineCode: z.string().max(20).nullable().optional(),
  /** Required by the service when a contraindication is present. */
  overrideReason: z.string().max(500).nullable().optional(),
});

export const referInput = consultIdInput.extend({
  type: z.enum(referralType.enumValues),
  recipient: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(10_000),
});

export const investigateInput = consultIdInput.extend({
  type: z.enum(investigationType.enumValues),
  tests: z.string().trim().min(2).max(1000),
  clinicalNotes: z.string().max(2000).optional(),
  copyToGp: z.boolean().default(false),
});

export const documentInput = consultIdInput.extend({
  type: z.enum(documentType.enumValues),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  body: z.string().max(10_000).optional(),
});

export const billingInput = consultIdInput.extend({
  itemNumber: z.string().nullable(),
  noBillingReason: z.string().max(500).nullable().optional(),
});

export const addFamilyInput = consultIdInput.extend({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  dob: z.string(),
  gender: z.string().max(30).optional(),
  symptomCategory: categorySchema,
  additionalInfo: z.string().max(2000).optional(),
});

export const profileInput = z.object({
  chosenName: z.string().max(80).nullable().optional(),
  qualifications: z.string().max(200).nullable().optional(),
  aiScribePersonalisation: z.string().max(4000).nullable().optional(),
  digitalSignature: z.string().nullable().optional(),
  prefTelehealth: z.boolean().optional(),
  prefHomeVisits: z.boolean().optional(),
  largeFont: z.boolean().optional(),
});

export const templateInput = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(120),
  body: z.string().max(20_000),
  isDefault: z.boolean().default(false),
});
