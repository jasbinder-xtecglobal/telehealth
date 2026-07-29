/**
 * Home-visit lifecycle and lone-worker safety.
 *
 * The safety rules here exist because a doctor attending an unfamiliar address
 * alone at night cannot be relied upon to raise an alarm — a panic button needs
 * a free hand and a conscious decision. Arrival starts a timer; failing to check
 * out escalates on its own.
 */
import type { VisitStatus } from "../../db/schema/dispatch.ts";
import { precondition } from "../errors.ts";

const TRANSITIONS: Record<VisitStatus, readonly VisitStatus[]> = {
  // Two legitimate routes onto a doctor's run: a dispatcher offers it, or the
  // doctor picks it up themselves off the board.
  unassigned: ["offered", "accepted"],
  offered: ["accepted", "declined", "unassigned"],
  accepted: ["en_route", "declined"],
  en_route: ["on_scene", "declined"],
  on_scene: ["completed"],
  completed: [],
  declined: ["unassigned", "offered"],
};

export function canTransition(from: VisitStatus, to: VisitStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertVisitTransition(from: VisitStatus, to: VisitStatus): void {
  if (!canTransition(from, to)) {
    throw precondition(
      `A visit cannot move from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}`,
      { from, to },
    );
  }
}

/* ------------------------------------------------------------------ *
 * Lone-worker safety
 * ------------------------------------------------------------------ */

export type SafetyThresholds = {
  /** Minutes on scene after which the doctor is prompted to check out. */
  checkOutDueMinutes: number;
  /** Minutes on scene after which dispatch is alerted automatically. */
  escalateAfterMinutes: number;
  /** Minutes en route after which dispatch should confirm arrival. */
  enRouteStaleMinutes: number;
};

export const DEFAULT_THRESHOLDS: SafetyThresholds = {
  checkOutDueMinutes: 45,
  escalateAfterMinutes: 60,
  enRouteStaleMinutes: 45,
};

export type SafetyLevel = "ok" | "due" | "overdue" | "escalate";

export type VisitSafety = {
  level: SafetyLevel;
  minutesOnScene: number | null;
  minutesEnRoute: number | null;
  message: string;
  /** True when dispatch must be alerted without further human action. */
  requiresEscalation: boolean;
};

export type VisitSafetyInput = {
  status: VisitStatus;
  enRouteAt: Date | null;
  arrivedAt: Date | null;
  departedAt: Date | null;
};

const minutesBetween = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000));

/**
 * Current safety state of a single visit.
 *
 * Returned as data rather than thrown so the same evaluation drives the
 * doctor's banner, the dispatcher's board and the automatic escalation.
 */
export function evaluateVisitSafety(
  visit: VisitSafetyInput,
  now: Date,
  thresholds: SafetyThresholds = DEFAULT_THRESHOLDS,
): VisitSafety {
  const base = {
    minutesOnScene: null as number | null,
    minutesEnRoute: null as number | null,
    requiresEscalation: false,
  };

  if (visit.status === "on_scene" && visit.arrivedAt && !visit.departedAt) {
    const onScene = minutesBetween(visit.arrivedAt, now);

    if (onScene >= thresholds.escalateAfterMinutes) {
      return {
        ...base,
        minutesOnScene: onScene,
        level: "escalate",
        requiresEscalation: true,
        message: `On scene ${onScene} min with no check-out — dispatch alerted.`,
      };
    }

    if (onScene >= thresholds.checkOutDueMinutes) {
      return {
        ...base,
        minutesOnScene: onScene,
        level: "overdue",
        message: `On scene ${onScene} min. Check out, or dispatch will be alerted at ${thresholds.escalateAfterMinutes} min.`,
      };
    }

    return {
      ...base,
      minutesOnScene: onScene,
      level: "ok",
      message: `On scene ${onScene} min.`,
    };
  }

  if (visit.status === "en_route" && visit.enRouteAt) {
    const enRoute = minutesBetween(visit.enRouteAt, now);
    if (enRoute >= thresholds.enRouteStaleMinutes) {
      return {
        ...base,
        minutesEnRoute: enRoute,
        level: "due",
        message: `En route ${enRoute} min without arriving — dispatch should confirm.`,
      };
    }
    return {
      ...base,
      minutesEnRoute: enRoute,
      level: "ok",
      message: `En route ${enRoute} min.`,
    };
  }

  return { ...base, level: "ok", message: "No active safety timer." };
}

/** Visits that must raise an alert right now, with no human intervention. */
export function visitsNeedingEscalation<T extends VisitSafetyInput & { id: string }>(
  visits: readonly T[],
  now: Date,
  thresholds: SafetyThresholds = DEFAULT_THRESHOLDS,
): T[] {
  return visits.filter(
    (v) => evaluateVisitSafety(v, now, thresholds).requiresEscalation,
  );
}
