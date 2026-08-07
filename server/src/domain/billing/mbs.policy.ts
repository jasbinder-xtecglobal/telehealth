/**
 * MBS item eligibility.
 *
 * Pure rules covering registration type, channel and consult duration. A
 * production build would add same-day duplicate detection, after-hours
 * time-of-day windows and co-claiming restrictions here — all of which belong
 * in this file, not scattered through the routers.
 */
import type { ConsultChannel, DoctorType } from "../../db/schema/enums.ts";

export type MbsItemFacts = {
  itemNumber: string;
  appliesTo: string[];
  channel: ConsultChannel | null;
  minMinutes: number | null;
  maxMinutes: number | null;
};

export type MbsValidation = {
  valid: boolean;
  errors: string[];
};

export function isClaimableBy(item: MbsItemFacts, doctorType: DoctorType): boolean {
  return item.appliesTo.includes(doctorType);
}

export function appliesToChannel(
  item: MbsItemFacts,
  channel: ConsultChannel,
): boolean {
  return item.channel === null || item.channel === channel;
}

/** Items a doctor may select for a given consult channel. */
export function selectableItems<T extends MbsItemFacts>(
  items: readonly T[],
  doctorType: DoctorType,
  channel: ConsultChannel,
): T[] {
  return items.filter(
    (i) => isClaimableBy(i, doctorType) && appliesToChannel(i, channel),
  );
}

export function validateItem(input: {
  item: MbsItemFacts;
  doctorType: DoctorType;
  consultChannel: ConsultChannel;
  durationMinutes: number;
}): MbsValidation {
  const { item, doctorType, consultChannel, durationMinutes } = input;
  const errors: string[] = [];

  if (!isClaimableBy(item, doctorType)) {
    errors.push(
      `Item ${item.itemNumber} is not claimable by a ${doctorType.replace(/_/g, " ")}`,
    );
  }

  if (!appliesToChannel(item, consultChannel)) {
    errors.push(
      `Item ${item.itemNumber} does not apply to ${consultChannel.replace(/_/g, " ")} consults`,
    );
  }

  if (item.minMinutes !== null && durationMinutes < item.minMinutes) {
    errors.push(
      `Consult ran ${durationMinutes} min; item ${item.itemNumber} requires at least ${item.minMinutes} min`,
    );
  }

  if (item.maxMinutes !== null && durationMinutes > item.maxMinutes) {
    errors.push(
      `Consult ran ${durationMinutes} min; item ${item.itemNumber} is capped at ${item.maxMinutes} min`,
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * A consult closed with no item and no reason is unpaid clinical work.
 * Enforced at the service layer; defined here.
 */
export function requiresNoBillingReason(itemNumber: string | null): boolean {
  return itemNumber === null;
}
