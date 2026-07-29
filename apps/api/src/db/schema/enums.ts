import { pgEnum } from "drizzle-orm/pg-core";

export const consultChannel = pgEnum("consult_channel", [
  "telehealth",
  "home_visit",
  "nh_telehealth",
]);

/** Consult lifecycle. A consult is in exactly one of these at any time. */
export const consultStatus = pgEnum("consult_status", [
  "requested",
  "queued",
  "claimed",
  "in_consult",
  "pending_attestation",
  "closed",
  "requeued",
  "rejected",
  "abandoned",
]);

export const consultPreference = pgEnum("consult_preference", ["phone", "video"]);

/**
 * Presenting-complaint categories. Closed set by design — the doctor's
 * "I do not wish to see" filter cannot operate reliably on free text.
 */
export const symptomCategory = pgEnum("symptom_category", [
  "mens_health",
  "womens_health",
  "gut_related",
  "skin",
  "mental_health_sleep_headache",
  "medical_certificate_only",
  "prescribed_weight_loss",
  "opioids",
  "other_issues",
]);

export const doctorType = pgEnum("doctor_type", [
  "gp_fellow",
  "vr",
  "non_vr",
  "registrar",
]);

export const artefactStatus = pgEnum("artefact_status", [
  "draft",
  "issued",
  "cancelled",
]);

export const prescriptionType = pgEnum("prescription_type", [
  "pbs",
  "streamlined_authority",
  "private",
]);

export const referralType = pgEnum("referral_type", ["specialist", "hospital"]);

export const investigationType = pgEnum("investigation_type", [
  "pathology",
  "radiology",
]);

export const investigationStatus = pgEnum("investigation_status", [
  "ordered",
  "resulted",
  "acknowledged",
]);

export const documentType = pgEnum("document_type", [
  "med_cert_work",
  "med_cert_school",
  "med_cert_university",
  "med_cert_carers",
  "fit_to_return",
  "blank",
]);

export const billingStatus = pgEnum("billing_status", [
  "pending",
  "submitted",
  "paid",
  "rejected",
  "no_billing",
]);

export const chatChannel = pgEnum("chat_channel", ["clinical", "dispatcher"]);

/**
 * Lives here rather than in `auth.ts` because `doctors` needs it and `auth`
 * needs `doctors` — declaring it beside the other enums breaks that cycle.
 */
export const accountStatus = pgEnum("account_status", [
  "pending_verification",
  "active",
  "suspended",
]);

export const auStateEnum = pgEnum("au_state", [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
]);

export type ConsultChannel = (typeof consultChannel.enumValues)[number];
export type ConsultStatus = (typeof consultStatus.enumValues)[number];
export type ConsultPreference = (typeof consultPreference.enumValues)[number];
export type SymptomCategory = (typeof symptomCategory.enumValues)[number];
export type DoctorType = (typeof doctorType.enumValues)[number];
export type PrescriptionType = (typeof prescriptionType.enumValues)[number];
export type ReferralType = (typeof referralType.enumValues)[number];
export type InvestigationType = (typeof investigationType.enumValues)[number];
export type DocumentType = (typeof documentType.enumValues)[number];
export type BillingStatus = (typeof billingStatus.enumValues)[number];
export type ChatChannelName = (typeof chatChannel.enumValues)[number];
export type AccountStatus = (typeof accountStatus.enumValues)[number];
export type AuState = (typeof auStateEnum.enumValues)[number];
