import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import type { DuressAlert, Visit } from "../../db/schema/dispatch.ts";
import { duressAlerts, visits } from "../../db/schema/index.ts";
import type { DispatchRepository, VisitWithContext } from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

const ACTIVE: Visit["status"][] = ["accepted", "en_route", "on_scene"];

export class DrizzleDispatchRepository
  extends DrizzleRepository
  implements DispatchRepository
{
  async findById(id: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.visits.findFirst({ where: eq(visits.id, id) })) ??
      null
    );
  }

  async findByIdWithContext(id: string, tx?: Executor) {
    return (
      ((await this.exec(tx).query.visits.findFirst({
        where: eq(visits.id, id),
        with: { consult: { with: { patient: true } } },
      })) as VisitWithContext | undefined) ?? null
    );
  }

  async findByConsult(consultId: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.visits.findFirst({
        where: eq(visits.consultId, consultId),
      })) ?? null
    );
  }

  async listBoard(tx?: Executor) {
    return (await this.exec(tx).query.visits.findMany({
      with: { consult: { with: { patient: true } } },
      orderBy: [asc(visits.routeOrder), asc(visits.createdAt)],
    })) as VisitWithContext[];
  }

  async listForDoctor(doctorId: string, tx?: Executor) {
    return (await this.exec(tx).query.visits.findMany({
      where: eq(visits.doctorId, doctorId),
      with: { consult: { with: { patient: true } } },
      orderBy: [asc(visits.routeOrder), asc(visits.createdAt)],
    })) as VisitWithContext[];
  }

  async listActive(tx?: Executor) {
    return (await this.exec(tx).query.visits.findMany({
      where: inArray(visits.status, ACTIVE),
      with: { consult: { with: { patient: true } } },
    })) as VisitWithContext[];
  }

  /**
   * Idempotent by consult.
   *
   * Guarded twice on purpose: the read short-circuits the common case, and
   * `onConflictDoNothing` against the `visit_consult_unq` index closes the race
   * between two concurrent board loads. Losing either guard silently
   * duplicates a doctor's run.
   */
  async create(input: { consultId: string; doctorId?: string | null }, tx?: Executor) {
    const existing = await this.findByConsult(input.consultId, tx);
    if (existing) return existing;

    const [row] = await this.exec(tx)
      .insert(visits)
      .values({ consultId: input.consultId, doctorId: input.doctorId ?? null })
      .onConflictDoNothing({ target: visits.consultId })
      .returning();

    return row ?? (await this.findByConsult(input.consultId, tx))!;
  }

  async update(id: string, patch: Partial<Visit>, tx?: Executor) {
    const [row] = await this.exec(tx)
      .update(visits)
      .set(patch)
      .where(eq(visits.id, id))
      .returning();
    return row ?? null;
  }

  async applyRoute(
    legs: readonly { id: string; order: number; distanceKm: number; etaMinutes: number }[],
    tx?: Executor,
  ) {
    const db = this.exec(tx);
    for (const leg of legs) {
      await db
        .update(visits)
        .set({
          routeOrder: leg.order,
          distanceKm: leg.distanceKm.toFixed(2),
          etaMinutes: leg.etaMinutes,
        })
        .where(eq(visits.id, leg.id));
    }
  }

  /* ---------------- duress ---------------- */

  async raiseAlert(
    input: {
      doctorId: string;
      visitId: string | null;
      source: string;
      latitude: string | null;
      longitude: string | null;
      note?: string | null;
    },
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx).insert(duressAlerts).values(input).returning();
    return row!;
  }

  async listOpenAlerts(tx?: Executor) {
    return this.exec(tx).query.duressAlerts.findMany({
      where: isNull(duressAlerts.resolvedAt),
      orderBy: [desc(duressAlerts.raisedAt)],
    });
  }

  /** Prevents the safety sweep raising a duplicate alert every time it runs. */
  async findOpenAlertForVisit(visitId: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.duressAlerts.findFirst({
        where: and(eq(duressAlerts.visitId, visitId), isNull(duressAlerts.resolvedAt)),
      })) ?? null
    );
  }

  async resolveAlert(
    id: string,
    resolvedBy: string,
    at: Date,
    tx?: Executor,
  ): Promise<DuressAlert | null> {
    const [row] = await this.exec(tx)
      .update(duressAlerts)
      .set({ resolvedAt: at, resolvedBy })
      .where(eq(duressAlerts.id, id))
      .returning();
    return row ?? null;
  }
}
