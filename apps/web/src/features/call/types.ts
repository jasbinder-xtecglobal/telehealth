import type { CallMode, CallProviderId } from "./providers/index.ts";

/**
 * A live call, as `call.start` describes it.
 *
 * Vendor-neutral on purpose: the dock passes `serverUrl` and `token` straight
 * to whichever stage matches `provider`, and never inspects either.
 */
export type ActiveCall = {
  sessionId: string;
  provider: CallProviderId;
  mode: CallMode;
  roomName: string;
  /** The doctor's own credentials. The patient's are inside `patientJoinUrl`. */
  doctor: { serverUrl: string; token: string };
  /** Link to hand the patient. Carries their token in the URL fragment. */
  patientJoinUrl: string;
};
