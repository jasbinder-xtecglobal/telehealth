/**
 * When a real-time call may be placed, and on which vendor.
 *
 * Pure. No vendor SDK, no clock, no I/O — the rules here are about the consult
 * and the doctor, never about how the media is carried. That separation is the
 * point: four transports are being trialled, and swapping one must not be able
 * to change who is allowed to call whom.
 *
 * As with `evaluateCloseGates`, the availability rules are returned as data so
 * the picker in the UI renders the server's answer rather than re-deriving it.
 */
import type {
  CallMode,
  CallProviderId,
  ConsultPreference,
  ConsultStatus,
} from "../../db/schema/enums.ts";
import { forbidden, notFound, precondition } from "../errors.ts";

/** The consult facts a call decision depends on. Nothing else is relevant. */
export type CallableConsult = {
  id: string;
  status: ConsultStatus;
  doctorId: string | null;
  patientJoinedAt: Date | null;
  /** What the patient asked for when they booked. */
  preference: ConsultPreference;
};

/** What the registry knows about one installed adapter. */
export type ProviderCapability = {
  id: CallProviderId;
  label: string;
  /** False when the vendor's credentials are absent from the environment. */
  configured: boolean;
  /** Why it is unconfigured, phrased for a developer — this is a dev-phase trial. */
  configHint: string | null;
  modes: readonly CallMode[];
};

/** One row in the picker. `available` is the server's answer, not a hint. */
export type CallOption = ProviderCapability & {
  available: boolean;
  /** Null when available. Otherwise why not, phrased for the doctor. */
  unavailableReason: string | null;
};

/**
 * The one blocker that is an authorisation failure rather than a state failure.
 * Exported so callers can distinguish the two without matching on prose.
 */
export const OTHER_DOCTOR = "This consult belongs to another doctor";

/** Statuses in which a doctor is with the patient and may open a call. */
const CALLABLE_STATUSES: readonly ConsultStatus[] = [
  "claimed",
  "in_consult",
  "pending_attestation",
];

/**
 * Video needs someone on the far end who can grant camera permission.
 *
 * A patient counts as reachable on two grounds:
 *
 *   - they have followed the link and arrived, or
 *   - they booked a video consultation in the first place.
 *
 * The second clause matters. Requiring arrival alone was circular: the link a
 * patient arrives through is minted *by* the call, so a patient who explicitly
 * asked for video could never be offered it. The doctor may now open the room
 * and wait, which is what happens on a phone call too.
 *
 * A phone-booked consult still holds the original rule — do not put a camera in
 * front of someone who did not ask for one until they are demonstrably there.
 */
export function videoRequiresPatient(consult: CallableConsult): boolean {
  return consult.patientJoinedAt === null && consult.preference !== "video";
}

/**
 * Why this consult cannot carry a call at all, or null if it can.
 * Independent of vendor and mode.
 */
export function consultCallBlocker(
  consult: CallableConsult,
  doctorId: string,
): string | null {
  if (consult.doctorId !== doctorId) return OTHER_DOCTOR;
  if (!CALLABLE_STATUSES.includes(consult.status)) {
    return consult.status === "closed"
      ? "This consult is closed"
      : "Claim the consult before calling";
  }
  return null;
}

/**
 * The picker's contents: every installed adapter, with a plain reason against
 * any that cannot be used right now. Unavailable providers are still listed —
 * during the trial, knowing a vendor exists but is unconfigured is the useful
 * signal.
 */
export function describeCallOptions(input: {
  consult: CallableConsult;
  doctorId: string;
  mode: CallMode;
  providers: readonly ProviderCapability[];
}): CallOption[] {
  const { consult, doctorId, mode, providers } = input;
  const blocker = consultCallBlocker(consult, doctorId);
  const needsPatient = mode === "video" && videoRequiresPatient(consult);

  return providers.map((p) => {
    const reason =
      blocker ??
      (needsPatient
        ? "The patient must join before video is available"
        : !p.modes.includes(mode)
          ? `${p.label} does not support ${mode} in this build`
          : !p.configured
            ? `${p.label} is not configured yet`
            : null);

    return { ...p, available: reason === null, unavailableReason: reason };
  });
}

/**
 * The enforcement half of the same rules. Throws the first failure.
 *
 * Deliberately re-derives from `describeCallOptions` so the checklist the
 * doctor sees and the check the server applies cannot drift apart.
 */
export function assertCallAllowed(input: {
  consult: CallableConsult;
  doctorId: string;
  mode: CallMode;
  provider: ProviderCapability | undefined;
}): void {
  const { consult, doctorId, mode, provider } = input;

  if (!provider) throw notFound("Call provider");

  const blocker = consultCallBlocker(consult, doctorId);
  if (blocker) {
    // Ownership is an authorisation failure; the rest are state failures.
    throw blocker === OTHER_DOCTOR ? forbidden(blocker) : precondition(blocker);
  }

  const [option] = describeCallOptions({
    consult,
    doctorId,
    mode,
    providers: [provider],
  });

  if (!option!.available) throw precondition(option!.unavailableReason!);
}
