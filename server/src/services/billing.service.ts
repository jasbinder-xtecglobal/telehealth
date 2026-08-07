import type { Doctor } from "../db/schema/doctors.ts";
import type { ConsultChannel } from "../db/schema/enums.ts";
import { durationMinutes } from "../domain/consult/consult.policy.ts";
import { invalid, notFound } from "../domain/errors.ts";
import { selectableItems, validateItem } from "../domain/billing/mbs.policy.ts";
import type { ClockPort } from "../integrations/ports.ts";
import type {
  BillingRepository,
  ConsultRepository,
  ReferenceRepository,
} from "../repositories/ports.ts";

/**
 * Billing use cases.
 *
 * Two rules enforced here that the reference software leaves to habit: a
 * consult cannot close with neither an item nor a reason, and item selection is
 * validated against the actual consult duration rather than accepted blindly.
 */
export class BillingService {
  constructor(
    private readonly consults: ConsultRepository,
    private readonly billings: BillingRepository,
    private readonly reference: ReferenceRepository,
    private readonly clock: ClockPort,
  ) {}

  /** Items this doctor may claim on this channel. */
  async selectableFor(doctor: Doctor, channel: ConsultChannel) {
    const all = await this.reference.listMbsItems();
    return selectableItems(all, doctor.doctorType, channel);
  }

  async record(input: {
    doctor: Doctor;
    consultId: string;
    itemNumber: string | null;
    noBillingReason: string | null;
  }) {
    const consult = await this.consults.findById(input.consultId);
    if (!consult) throw notFound("Consult");

    await this.billings.clearForConsult(input.consultId);

    /* -------- no billing -------- */
    if (input.itemNumber === null) {
      if (!input.noBillingReason?.trim()) {
        throw invalid("A reason is required when not billing");
      }

      const billing = await this.billings.create({
        consultId: input.consultId,
        doctorId: input.doctor.id,
        itemNumber: null,
        description: null,
        fee: "0",
        status: "no_billing",
        noBillingReason: input.noBillingReason.trim(),
      });

      return { billing, errors: [] as string[], durationMinutes: 0 };
    }

    /* -------- item selected -------- */
    const item = await this.reference.findMbsItem(input.itemNumber);
    if (!item) throw notFound("MBS item");

    const duration = durationMinutes(consult, this.clock.now());

    const validation = validateItem({
      item,
      doctorType: input.doctor.doctorType,
      consultChannel: consult.channel,
      durationMinutes: duration,
    });

    const billing = await this.billings.create({
      consultId: input.consultId,
      doctorId: input.doctor.id,
      itemNumber: item.itemNumber,
      description: item.description,
      fee: item.fee,
      status: "pending",
    });

    // Warnings are surfaced, not fatal — a doctor may have a valid reason.
    return { billing, errors: validation.errors, durationMinutes: duration };
  }
}
