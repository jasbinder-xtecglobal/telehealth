import type { Visit, VisitStatus } from "../db/schema/dispatch.ts";
import type { Doctor } from "../db/schema/doctors.ts";
import {
  DEFAULT_THRESHOLDS,
  assertVisitTransition,
  evaluateVisitSafety,
  visitsNeedingEscalation,
  type VisitSafety,
} from "../domain/dispatch/visit.policy.ts";
import { invalid, notFound } from "../domain/errors.ts";
import type {
  ClockPort,
  EventBusPort,
  RoutingPort,
  SmsPort,
} from "../integrations/ports.ts";
import type {
  AuditRepository,
  ConsultRepository,
  DispatchRepository,
  DoctorRepository,
  VisitWithContext,
} from "../repositories/ports.ts";

/** Melbourne CBD — fallback origin when a doctor has no recorded position. */
const DEFAULT_ORIGIN = { latitude: -37.8136, longitude: 144.9631 };

export type BoardVisit = {
  visitId: string;
  consultId: string;
  status: VisitStatus;
  doctorId: string | null;
  patientName: string;
  address: string;
  suburb: string | null;
  latitude: number | null;
  longitude: number | null;
  acuity: number;
  symptom: string;
  additionalInfo: string | null;
  routeOrder: number | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  arrivedAt: Date | null;
  safety: VisitSafety;
};

/**
 * Home-visit dispatch.
 *
 * Owns three things: turning queued home-visit consults into dispatchable
 * visits, sequencing a doctor's run, and the lone-worker safety loop. The rules
 * for *what order* and *when to escalate* live in the dispatch policies; this
 * service only orchestrates.
 */
export class DispatchService {
  constructor(
    private readonly dispatch: DispatchRepository,
    private readonly consults: ConsultRepository,
    private readonly doctors: DoctorRepository,
    private readonly routing: RoutingPort,
    private readonly sms: SmsPort,
    private readonly events: EventBusPort,
    private readonly audit: AuditRepository,
    private readonly clock: ClockPort,
  ) {}

  private actor(doctor: Doctor) {
    return {
      actorId: doctor.id,
      actorName: `${doctor.firstName} ${doctor.lastName}`,
    };
  }

  private toBoardVisit(v: VisitWithContext, now: Date): BoardVisit {
    const p = v.consult.patient;
    return {
      visitId: v.id,
      consultId: v.consultId,
      status: v.status,
      doctorId: v.doctorId,
      patientName: `${p.firstName} ${p.lastName}`,
      address: [p.addressLine, p.suburb, p.state, p.postcode].filter(Boolean).join(", "),
      suburb: p.suburb,
      latitude: p.latitude === null ? null : Number(p.latitude),
      longitude: p.longitude === null ? null : Number(p.longitude),
      acuity: v.consult.acuity,
      symptom: v.consult.symptomCategory,
      additionalInfo: v.consult.additionalInfo,
      routeOrder: v.routeOrder,
      distanceKm: v.distanceKm === null ? null : Number(v.distanceKm),
      etaMinutes: v.etaMinutes,
      arrivedAt: v.arrivedAt,
      safety: evaluateVisitSafety(v, now),
    };
  }

  /* ---------------------------------------------------------------- *
   * Board
   * ---------------------------------------------------------------- */

  /**
   * Ensures every queued home-visit consult has a dispatch record, then returns
   * the board. Idempotent — safe to call on every page load.
   */
  async board(): Promise<BoardVisit[]> {
    const queued = await this.consults.listQueued("home_visit");
    for (const c of queued) {
      await this.dispatch.create({ consultId: c.id });
    }

    const now = this.clock.now();
    const rows = await this.dispatch.listBoard();
    return rows
      .filter((v) => v.status !== "completed")
      .map((v) => this.toBoardVisit(v, now));
  }

  async myRun(doctor: Doctor): Promise<BoardVisit[]> {
    const now = this.clock.now();
    const rows = await this.dispatch.listForDoctor(doctor.id);
    return rows
      .filter((v) => v.status !== "completed" && v.status !== "declined")
      .map((v) => this.toBoardVisit(v, now));
  }

  async openAlerts() {
    return this.dispatch.listOpenAlerts();
  }

  /* ---------------------------------------------------------------- *
   * Assignment
   * ---------------------------------------------------------------- */

  async offer(doctor: Doctor, visitId: string, toDoctorId: string) {
    const visit = await this.requireVisit(visitId);
    assertVisitTransition(visit.status, "offered");

    const updated = await this.dispatch.update(visitId, {
      status: "offered",
      doctorId: toDoctorId,
      offeredAt: this.clock.now(),
    });

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "visit.offered",
      entityType: "visit",
      entityId: visitId,
      payload: { toDoctorId },
    });

    this.events.publish({ type: "dispatch.changed", doctorId: toDoctorId });
    return updated!;
  }

  async accept(doctor: Doctor, visitId: string) {
    const visit = await this.requireVisit(visitId);
    assertVisitTransition(visit.status, "accepted");

    if (visit.doctorId && visit.doctorId !== doctor.id) {
      throw invalid("This visit was offered to another doctor");
    }

    const updated = await this.dispatch.update(visitId, {
      status: "accepted",
      doctorId: doctor.id,
      acceptedAt: this.clock.now(),
    });

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "visit.accepted",
      entityType: "visit",
      entityId: visitId,
    });

    // Accepting changes the run, so the route is no longer valid.
    await this.buildRoute(doctor);
    this.events.publish({ type: "dispatch.changed", doctorId: doctor.id });
    return updated!;
  }

  async decline(doctor: Doctor, visitId: string, reason: string) {
    const visit = await this.requireVisit(visitId);
    assertVisitTransition(visit.status, "declined");

    await this.dispatch.update(visitId, {
      status: "declined",
      declineReason: reason,
    });

    // Returns to the pool for another doctor rather than disappearing.
    const updated = await this.dispatch.update(visitId, {
      status: "unassigned",
      doctorId: null,
      offeredAt: null,
      acceptedAt: null,
      routeOrder: null,
      etaMinutes: null,
    });

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "visit.declined",
      entityType: "visit",
      entityId: visitId,
      payload: { reason },
    });

    this.events.publish({ type: "dispatch.changed", doctorId: doctor.id });
    return updated!;
  }

  /* ---------------------------------------------------------------- *
   * Route
   * ---------------------------------------------------------------- */

  /** Re-sequences the doctor's accepted and en-route visits from their position. */
  async buildRoute(doctor: Doctor): Promise<BoardVisit[]> {
    const rows = await this.dispatch.listForDoctor(doctor.id);
    const routable = rows.filter(
      (v) => v.status === "accepted" || v.status === "en_route",
    );

    const stops = routable
      .filter((v) => v.consult.patient.latitude && v.consult.patient.longitude)
      .map((v) => ({
        id: v.id,
        label: `${v.consult.patient.firstName} ${v.consult.patient.lastName}`,
        acuity: v.consult.acuity,
        latitude: Number(v.consult.patient.latitude),
        longitude: Number(v.consult.patient.longitude),
      }));

    if (stops.length > 0) {
      const origin =
        doctor.latitude && doctor.longitude
          ? { latitude: Number(doctor.latitude), longitude: Number(doctor.longitude) }
          : DEFAULT_ORIGIN;

      const legs = await this.routing.optimise({ origin, stops });
      await this.dispatch.applyRoute(legs);
    }

    this.events.publish({ type: "dispatch.changed", doctorId: doctor.id });
    return this.myRun(doctor);
  }

  async updateLocation(doctor: Doctor, latitude: number, longitude: number) {
    await this.doctors.update(doctor.id, {
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      locationUpdatedAt: this.clock.now(),
    });
    this.events.publish({ type: "dispatch.changed", doctorId: doctor.id });
    return { ok: true as const };
  }

  /* ---------------------------------------------------------------- *
   * Travel and the safety timer
   * ---------------------------------------------------------------- */

  async departFor(doctor: Doctor, visitId: string) {
    const visit = await this.requireVisit(visitId);
    assertVisitTransition(visit.status, "en_route");

    const updated = await this.dispatch.update(visitId, {
      status: "en_route",
      enRouteAt: this.clock.now(),
    });

    const context = await this.dispatch.findByIdWithContext(visitId);
    if (context) {
      await this.sms.send({
        to: context.consult.patient.phone,
        body: `Dr ${doctor.chosenName ?? doctor.lastName} is on the way${
          visit.etaMinutes ? `, arriving in about ${visit.etaMinutes} minutes` : ""
        }.`,
      });
    }

    this.events.publish({ type: "dispatch.changed", doctorId: doctor.id });
    return updated!;
  }

  /** Check-in. Starts the lone-worker timer. */
  async arrive(doctor: Doctor, visitId: string) {
    const visit = await this.requireVisit(visitId);
    assertVisitTransition(visit.status, "on_scene");

    const updated = await this.dispatch.update(visitId, {
      status: "on_scene",
      arrivedAt: this.clock.now(),
    });

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "visit.arrived",
      entityType: "visit",
      entityId: visitId,
    });

    this.events.publish({ type: "dispatch.changed", doctorId: doctor.id });
    return updated!;
  }

  /** Check-out. Stops the timer and resolves any auto-raised alert. */
  async depart(doctor: Doctor, visitId: string) {
    const visit = await this.requireVisit(visitId);
    assertVisitTransition(visit.status, "completed");

    const now = this.clock.now();
    const updated = await this.dispatch.update(visitId, {
      status: "completed",
      departedAt: now,
    });

    const open = await this.dispatch.findOpenAlertForVisit(visitId);
    if (open) {
      await this.dispatch.resolveAlert(
        open.id,
        `${doctor.firstName} ${doctor.lastName}`,
        now,
      );
    }

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "visit.departed",
      entityType: "visit",
      entityId: visitId,
    });

    this.events.publish({ type: "dispatch.changed", doctorId: doctor.id });
    return updated!;
  }

  /* ---------------------------------------------------------------- *
   * Duress
   * ---------------------------------------------------------------- */

  async raisePanic(doctor: Doctor, input: { visitId?: string; note?: string }) {
    const alert = await this.dispatch.raiseAlert({
      doctorId: doctor.id,
      visitId: input.visitId ?? null,
      source: "panic",
      latitude: doctor.latitude,
      longitude: doctor.longitude,
      note: input.note ?? null,
    });

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "duress.raised",
      entityType: "duress_alert",
      entityId: alert.id,
      payload: { source: "panic" },
    });

    this.events.publish({ type: "duress.raised", doctorId: doctor.id, alertId: alert.id });
    return alert;
  }

  /**
   * Automatic escalation.
   *
   * Run on demand by the board and by any dispatcher poll. This is the control
   * that a panic button cannot be: it fires without the doctor doing anything.
   */
  async runSafetySweep(): Promise<{ raised: number; thresholds: typeof DEFAULT_THRESHOLDS }> {
    const now = this.clock.now();
    const active = await this.dispatch.listActive();
    const breached = visitsNeedingEscalation(active, now);

    let raised = 0;
    for (const visit of breached) {
      if (!visit.doctorId) continue;

      // One alert per breach, not one per sweep.
      const existing = await this.dispatch.findOpenAlertForVisit(visit.id);
      if (existing) continue;

      const alert = await this.dispatch.raiseAlert({
        doctorId: visit.doctorId,
        visitId: visit.id,
        source: "overdue_checkout",
        latitude: visit.consult.patient.latitude,
        longitude: visit.consult.patient.longitude,
        note: `No check-out ${DEFAULT_THRESHOLDS.escalateAfterMinutes}+ minutes after arrival at ${visit.consult.patient.suburb ?? "the address"}.`,
      });

      this.events.publish({
        type: "duress.raised",
        doctorId: visit.doctorId,
        alertId: alert.id,
      });
      raised++;
    }

    return { raised, thresholds: DEFAULT_THRESHOLDS };
  }

  async resolveAlert(doctor: Doctor, alertId: string) {
    const resolved = await this.dispatch.resolveAlert(
      alertId,
      `${doctor.firstName} ${doctor.lastName}`,
      this.clock.now(),
    );
    if (!resolved) throw notFound("Alert");

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "duress.resolved",
      entityType: "duress_alert",
      entityId: alertId,
    });

    return resolved;
  }

  private async requireVisit(visitId: string): Promise<Visit> {
    const visit = await this.dispatch.findById(visitId);
    if (!visit) throw notFound("Visit");
    return visit;
  }
}
