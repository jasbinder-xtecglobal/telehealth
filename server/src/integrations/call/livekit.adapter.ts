/**
 * LiveKit — candidate 1 of 4.
 *
 * The whole of this codebase's knowledge of LiveKit lives in this file. Delete
 * it and remove its line from `container.ts` and no other module changes; the
 * picker loses a row and everything else carries on.
 *
 * Tokens are minted here rather than in the service because the JWT shape is a
 * vendor detail. The API secret never leaves this process — the browser only
 * ever receives a signed, expiring, single-room token.
 */
import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import type { CallMode } from "../../db/schema/enums.ts";
import type {
  CallCredentials,
  CallProviderPort,
  CallSessionHandle,
} from "../ports.ts";

export type LiveKitConfig = {
  /** `wss://<project>.livekit.cloud`, or `ws://localhost:7880` self-hosted. */
  url: string | undefined;
  apiKey: string | undefined;
  apiSecret: string | undefined;
};

/**
 * LiveKit's REST endpoint is the same host over https. The client SDK wants
 * `wss://`; the server SDK wants `https://`.
 */
function httpEndpoint(wsUrl: string): string {
  return wsUrl.replace(/^ws:/, "http:").replace(/^wss:/, "https:");
}

export class LiveKitCallProvider implements CallProviderPort {
  readonly id = "livekit" as const;
  readonly label = "LiveKit";
  readonly modes = ["audio", "video"] as const;

  constructor(private readonly config: LiveKitConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.url && this.config.apiKey && this.config.apiSecret);
  }

  configHint(): string | null {
    if (this.isConfigured()) return null;

    const missing = [
      !this.config.url && "LIVEKIT_URL",
      !this.config.apiKey && "LIVEKIT_API_KEY",
      !this.config.apiSecret && "LIVEKIT_API_SECRET",
    ].filter((v): v is string => typeof v === "string");

    return `Set ${missing.join(", ")} in .env and restart the API`;
  }

  async open(input: {
    roomName: string;
    mode: CallMode;
    doctorName: string;
    patientName: string;
    ttlSeconds: number;
  }): Promise<CallSessionHandle> {
    // The service checks `isConfigured()` through the policy before we get
    // here; this guard is for the adapter's own callers in tests.
    if (!this.isConfigured()) {
      throw new Error(`LiveKit is not configured. ${this.configHint()}`);
    }

    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);

    const [doctor, patient] = await Promise.all([
      this.mint({
        roomName: input.roomName,
        identity: "doctor",
        displayName: input.doctorName,
        mode: input.mode,
        ttlSeconds: input.ttlSeconds,
        expiresAt,
      }),
      this.mint({
        roomName: input.roomName,
        identity: "patient",
        displayName: input.patientName,
        mode: input.mode,
        ttlSeconds: input.ttlSeconds,
        expiresAt,
      }),
    ]);

    return { roomName: input.roomName, doctor, patient };
  }

  async close(roomName: string): Promise<void> {
    if (!this.isConfigured()) return;

    try {
      const client = new RoomServiceClient(
        httpEndpoint(this.config.url!),
        this.config.apiKey!,
        this.config.apiSecret!,
      );
      await client.deleteRoom(roomName);
    } catch {
      // The room may never have been created — nobody joined — or LiveKit may
      // have reaped it already. Either way the session is over, and failing to
      // tear down a room the patient has already left must not fail the call
      // that ends the consult.
    }
  }

  private async mint(input: {
    roomName: string;
    identity: string;
    displayName: string;
    mode: CallMode;
    ttlSeconds: number;
    expiresAt: Date;
  }): Promise<CallCredentials> {
    const token = new AccessToken(this.config.apiKey!, this.config.apiSecret!, {
      identity: input.identity,
      name: input.displayName,
      ttl: input.ttlSeconds,
    });

    token.addGrant({
      room: input.roomName,
      roomJoin: true,
      // The room is created on first join; neither side needs admin rights.
      canPublish: true,
      canSubscribe: true,
      // Data messages carry LiveKit's own signalling for mode changes.
      canPublishData: true,
      // Audio-only mode is enforced here as well as in the browser, so a
      // tampered client cannot publish video into a phone consult.
      canPublishSources:
        input.mode === "audio"
          ? [TrackSource.MICROPHONE]
          : [
              TrackSource.MICROPHONE,
              TrackSource.CAMERA,
              TrackSource.SCREEN_SHARE,
              TrackSource.SCREEN_SHARE_AUDIO,
            ],
    });

    return {
      provider: this.id,
      serverUrl: this.config.url!,
      token: await token.toJwt(),
      identity: input.identity,
      displayName: input.displayName,
      expiresAt: input.expiresAt,
    };
  }
}
