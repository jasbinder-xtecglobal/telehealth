/**
 * Placing a doctor and a patient on a call.
 *
 * Knows nothing about any vendor. It asks the domain whether a call is allowed,
 * asks the registry for whichever adapter the doctor picked, records the session
 * and audits it. Swapping LiveKit for Agora changes `container.ts` and one
 * adapter file — not this service.
 *
 * Nothing here touches clinical artefacts. A call is a conversation; the
 * consult-close path remains the only thing that releases anything to a
 * patient (invariant 1).
 */
import { randomUUID } from "node:crypto";
import type { Doctor } from "../db/schema/doctors.ts";
import type { CallMode, CallProviderId } from "../db/schema/enums.ts";
import {
  assertCallAllowed,
  consultCallBlocker,
  describeCallOptions,
  OTHER_DOCTOR,
  type CallableConsult,
  type ProviderCapability,
} from "../domain/call/call.policy.ts";
import { forbidden, notFound } from "../domain/errors.ts";
import type {
  CallProviderPort,
  CallProviderRegistryPort,
  ClockPort,
  EventBusPort,
} from "../integrations/ports.ts";
import type {
  AuditRepository,
  CallRepository,
  ConsultRepository,
} from "../repositories/ports.ts";

/**
 * Join credentials outlive the consult they were minted for, so they expire on
 * their own. Two hours covers a long consult plus a reconnect; a doctor whose
 * token expires mid-call presses the button again.
 */
const TOKEN_TTL_SECONDS = 2 * 60 * 60;

export class CallService {
  constructor(
    private readonly consults: ConsultRepository,
    private readonly calls: CallRepository,
    private readonly providers: CallProviderRegistryPort,
    private readonly audit: AuditRepository,
    private readonly events: EventBusPort,
    private readonly clock: ClockPort,
    /** Origin the patient's join link points at. */
    private readonly webOrigin: string,
  ) {}

  /**
   * What the picker shows: every installed vendor, and for each one whether it
   * can carry this call right now. The client renders this answer rather than
   * re-deriving the rules (the close-checklist convention).
   */
  async options(doctor: Doctor, input: { consultId: string; mode: CallMode }) {
    const consult = await this.requireConsult(input.consultId);
    const active = await this.calls.findActive(input.consultId);

    return {
      consultId: input.consultId,
      mode: input.mode,
      options: describeCallOptions({
        consult,
        doctorId: doctor.id,
        mode: input.mode,
        providers: this.providers.list().map(capabilityOf),
      }),
      active: active
        ? {
            id: active.id,
            provider: active.provider,
            mode: active.mode,
            startedAt: active.startedAt,
          }
        : null,
    };
  }

  /**
   * Opens a room and returns the doctor's credentials plus a link for the
   * patient.
   *
   * The patient's token travels in the link's fragment, so it never reaches a
   * server log or the Referer header, and it is scoped to one room with no
   * clinical claims attached. That is what allows the patient to join without
   * an account and without any unauthenticated endpoint reading their record
   * (invariant 11).
   */
  async start(
    doctor: Doctor,
    input: { consultId: string; provider: CallProviderId; mode: CallMode },
  ) {
    const consult = await this.requireConsult(input.consultId);
    const adapter = this.providers.get(input.provider);

    assertCallAllowed({
      consult,
      doctorId: doctor.id,
      mode: input.mode,
      provider: adapter ? capabilityOf(adapter) : undefined,
    });

    const patient = await this.consults.findWithPatient(input.consultId);
    if (!patient) throw notFound("Consult");

    // One live session per consult. Switching vendor mid-consult ends the old
    // session first so the comparison data stays honest about who carried what.
    const existing = await this.calls.findActive(input.consultId);
    if (existing && (existing.provider !== input.provider || existing.mode !== input.mode)) {
      await this.finish(existing.id, existing.provider, existing.roomName, "switched");
    }

    const reusable =
      existing && existing.provider === input.provider && existing.mode === input.mode
        ? existing
        : null;

    // A fresh room per session, not per consult.
    //
    // Vendors create a room on first join, so a deterministic name means a
    // patient link from an earlier session still opens a room of that name
    // hours later — after the doctor hung up, and even on a subsequent call.
    // The random suffix makes every session's link dead the moment it ends.
    const roomName =
      reusable?.roomName ?? `consult-${input.consultId}-${randomUUID().slice(0, 8)}`;

    const handle = await adapter!.open({
      roomName,
      mode: input.mode,
      doctorName: `Dr ${doctor.chosenName ?? doctor.lastName}`,
      patientName: patient.patient.firstName,
      ttlSeconds: TOKEN_TTL_SECONDS,
    });

    const session =
      reusable ??
      (await this.calls.open({
        consultId: input.consultId,
        provider: input.provider,
        mode: input.mode,
        roomName: handle.roomName,
        startedByDoctorId: doctor.id,
      }));

    await this.audit.record({
      actorId: doctor.id,
      actorName: `Dr ${doctor.firstName} ${doctor.lastName}`,
      // A rejoin is a distinct event — it is the signal that a vendor is
      // dropping calls, which is the whole reason for the trial.
      eventType: reusable ? "call.rejoined" : "call.started",
      entityType: "call_session",
      entityId: session.id,
      payload: {
        consultId: input.consultId,
        provider: input.provider,
        mode: input.mode,
      },
    });

    this.events.publish({ type: "consult.changed", consultId: input.consultId });

    return {
      sessionId: session.id,
      provider: input.provider,
      mode: input.mode,
      roomName: handle.roomName,
      startedAt: session.startedAt,
      doctor: handle.doctor,
      patientJoinUrl: this.joinUrl(handle.patient, input.mode),
    };
  }

  /** Ends the live session on a consult. A no-op when there is none. */
  async end(doctor: Doctor, input: { consultId: string; reason?: string }) {
    // Hanging up is as much a clinical action as dialling: only the doctor
    // holding the consult may do it. Without this any signed-in doctor could
    // drop a colleague's call by consult id alone.
    const consult = await this.requireConsult(input.consultId);
    const blocker = consultCallBlocker(consult, doctor.id);
    if (blocker === OTHER_DOCTOR) throw forbidden(blocker);

    const active = await this.calls.findActive(input.consultId);
    if (!active) return { ended: false as const };

    await this.finish(
      active.id,
      active.provider,
      active.roomName,
      input.reason ?? "doctor_ended",
    );

    await this.audit.record({
      actorId: doctor.id,
      actorName: `Dr ${doctor.firstName} ${doctor.lastName}`,
      eventType: "call.ended",
      entityType: "call_session",
      entityId: active.id,
      payload: {
        consultId: input.consultId,
        provider: active.provider,
        seconds: Math.round(
          (this.clock.now().getTime() - active.startedAt.getTime()) / 1000,
        ),
      },
    });

    this.events.publish({ type: "consult.changed", consultId: input.consultId });
    return { ended: true as const };
  }

  /**
   * Called by `ConsultService.close` — a consult must not leave a room open
   * behind it. Deliberately unauthenticated: the caller has already proved
   * ownership to close the consult.
   */
  async endForConsult(consultId: string, reason: string) {
    const active = await this.calls.findActive(consultId);
    if (!active) return;
    await this.finish(active.id, active.provider, active.roomName, reason);
  }

  /** Per-consult call history — which vendor, how long, how often. */
  async history(doctor: Doctor, consultId: string) {
    const consult = await this.requireConsult(consultId);
    if (consult.doctorId !== doctor.id) return [];
    return this.calls.listForConsult(consultId);
  }

  /* ---------------- internals ---------------- */

  private async finish(
    sessionId: string,
    provider: CallProviderId,
    roomName: string,
    reason: string,
  ) {
    await this.calls.close(sessionId, { endedAt: this.clock.now(), reason });
    // Best-effort, and after the row is closed: a vendor that is down must not
    // leave the session looking live forever.
    await this.providers.get(provider)?.close(roomName);
  }

  private async requireConsult(consultId: string): Promise<CallableConsult> {
    const consult = await this.consults.findById(consultId);
    if (!consult) throw notFound("Consult");
    return {
      id: consult.id,
      status: consult.status,
      doctorId: consult.doctorId,
      patientJoinedAt: consult.patientJoinedAt,
      preference: consult.preference,
    };
  }

  private joinUrl(
    patient: { serverUrl: string; token: string; provider: CallProviderId },
    mode: CallMode,
  ): string {
    const fragment = new URLSearchParams({
      p: patient.provider,
      u: patient.serverUrl,
      t: patient.token,
      m: mode,
    });
    return `${this.webOrigin}/join#${fragment.toString()}`;
  }
}

/** The adapter's self-description, reduced to what the domain reasons about. */
function capabilityOf(p: CallProviderPort): ProviderCapability {
  return {
    id: p.id,
    label: p.label,
    configured: p.isConfigured(),
    configHint: p.configHint(),
    modes: p.modes,
  };
}
