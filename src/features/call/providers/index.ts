/**
 * The vendor stages the client knows how to render.
 *
 * One entry per adapter registered on the server. Each is lazily imported, so a
 * vendor's SDK is only downloaded if a doctor actually picks that vendor — and
 * deleting a vendor is deleting its module and its line here.
 *
 * Nothing outside this folder imports a vendor SDK.
 */
import { lazy, type ComponentType } from "react";

/** Mirrors `CallProviderId` on the server. */
export type CallProviderId = "livekit" | "agora" | "twilio" | "zoom";
export type CallMode = "audio" | "video";

/** Every vendor stage renders from exactly this, whatever its SDK wants. */
export type CallStageProps = {
  serverUrl: string;
  token: string;
  mode: CallMode;
  /** Doctor side shows patient-facing controls; patient side does not. */
  role: "doctor" | "patient";
  onLeave: () => void;
};

export const CALL_STAGES: Partial<
  Record<CallProviderId, ComponentType<CallStageProps>>
> = {
  livekit: lazy(() =>
    import("./LiveKitStage.tsx").then((m) => ({ default: m.LiveKitStage })),
  ),
};
