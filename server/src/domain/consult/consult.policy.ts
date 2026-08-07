/**
 * Consult lifecycle rules.
 *
 * Pure functions over plain data — no database, no clock beyond what is passed
 * in, no framework. Every rule here is directly unit-testable and is the single
 * definition of "when may this happen".
 */
import type { ConsultStatus } from "../../db/schema/enums.ts";
import { forbidden, precondition } from "../errors.ts";

/** Statuses from which a consult may be claimed off the queue. */
export const CLAIMABLE_STATUSES = ["queued", "requeued"] as const satisfies readonly ConsultStatus[];

/** Statuses in which a doctor is actively holding the consult. */
export const ACTIVE_STATUSES = [
  "claimed",
  "in_consult",
  "pending_attestation",
] as const satisfies readonly ConsultStatus[];

const TRANSITIONS: Record<ConsultStatus, readonly ConsultStatus[]> = {
  requested: ["queued", "abandoned"],
  queued: ["claimed", "rejected", "abandoned"],
  requeued: ["claimed", "rejected", "abandoned"],
  claimed: ["in_consult", "requeued", "abandoned"],
  in_consult: ["pending_attestation", "closed", "requeued", "abandoned"],
  pending_attestation: ["closed", "in_consult", "requeued"],
  rejected: ["queued", "claimed", "abandoned"],
  closed: [],
  abandoned: [],
};

export function canTransition(from: ConsultStatus, to: ConsultStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ConsultStatus, to: ConsultStatus): void {
  if (!canTransition(from, to)) {
    throw precondition(
      `A consult cannot move from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}`,
      { from, to },
    );
  }
}

export function isClaimable(status: ConsultStatus): boolean {
  return (CLAIMABLE_STATUSES as readonly ConsultStatus[]).includes(status);
}

/** The acting doctor must own the consult to act on it. */
export function assertOwnedBy(
  consult: { doctorId: string | null },
  doctorId: string,
): void {
  if (consult.doctorId !== doctorId) {
    throw forbidden("This consult is assigned to another doctor");
  }
}

/* ------------------------------------------------------------------ *
 * Close gates
 * ------------------------------------------------------------------ */

export type CloseCandidate = {
  status: ConsultStatus;
  notes: string | null;
  notesAttestedAt: Date | null;
  billingCount: number;
};

export type CloseGate = {
  key: "notes" | "attested" | "billing" | "status";
  satisfied: boolean;
  message: string;
};

/**
 * The four conditions that must hold before a consult may close.
 *
 * Returned as data rather than thrown so the UI can render the checklist and
 * the service can enforce it from the same definition — one source of truth.
 */
export function evaluateCloseGates(c: CloseCandidate): CloseGate[] {
  return [
    {
      key: "status",
      satisfied: c.status === "in_consult" || c.status === "pending_attestation",
      message: "Consult must be in progress",
    },
    {
      key: "notes",
      satisfied: Boolean(c.notes?.trim()),
      message: "Clinical notes are required before a consult can be closed",
    },
    {
      key: "attested",
      satisfied: Boolean(c.notesAttestedAt),
      message: "Notes must be reviewed and attested before closing",
    },
    {
      key: "billing",
      satisfied: c.billingCount > 0,
      message: "Record a billing item, or an explicit no-billing reason",
    },
  ];
}

export function assertClosable(c: CloseCandidate): void {
  const failed = evaluateCloseGates(c).find((g) => !g.satisfied);
  if (failed) throw precondition(failed.message, { gate: failed.key });
}

/* ------------------------------------------------------------------ *
 * Attestation
 * ------------------------------------------------------------------ */

export function assertAttestable(notes: string | null): void {
  if (!notes?.trim()) {
    throw precondition("Cannot attest empty notes");
  }
}

/**
 * Any change to the note text invalidates a prior attestation — the doctor
 * signed off on specific words, not on the record in the abstract.
 */
export function attestationSurvivesEdit(): boolean {
  return false;
}

/* ------------------------------------------------------------------ *
 * Consult duration
 * ------------------------------------------------------------------ */

export function durationMinutes(
  consult: { startedAt: Date | null; claimedAt: Date | null; requestedAt: Date },
  now: Date,
): number {
  const from = consult.startedAt ?? consult.claimedAt ?? consult.requestedAt;
  return Math.max(1, Math.round((now.getTime() - from.getTime()) / 60_000));
}
