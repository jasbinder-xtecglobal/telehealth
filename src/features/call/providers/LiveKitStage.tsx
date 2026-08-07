/**
 * LiveKit's rendering surface — candidate 1 of 4.
 *
 * The only file in the web app that imports a LiveKit package. It receives a
 * server URL, a token and a mode, and returns pixels; it knows nothing about
 * consults, patients or the queue, which is what keeps a vendor swap to this
 * folder.
 *
 * Both sides of the call render this same component. The doctor and the patient
 * differ only in which token they were handed.
 */
import "@livekit/components-styles";
import {
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  RoomContext,
  useTracks,
} from "@livekit/components-react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import type { CallStageProps } from "./index.ts";

export function LiveKitStage({
  serverUrl,
  token,
  mode,
  role,
  onLeave,
}: CallStageProps) {
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  // `onLeave` is a new function on every parent render. Held in a ref so the
  // connect effect below does not re-run — reconnecting on an unrelated render
  // is what "PC manager is closed" looks like from the inside.
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  useEffect(() => {
    // The Room is created *inside* the effect, never reused across runs. React
    // StrictMode mounts, unmounts and remounts in development; a Room that has
    // been disconnected cannot be reconnected, so each run needs its own.
    //
    // Adaptive streaming and dynacast are LiveKit's own bandwidth controls —
    // worth leaving on, since call quality on a poor connection is exactly what
    // this trial exists to compare.
    const r = new Room({ adaptiveStream: true, dynacast: true });
    let cancelled = false;

    const handleDisconnect = () => onLeaveRef.current();
    r.on(RoomEvent.Disconnected, handleDisconnect);

    void (async () => {
      try {
        // Browsers withhold `navigator.mediaDevices` entirely on an insecure
        // origin, so the failure would otherwise surface as an undefined
        // property deep inside the vendor SDK. Say what is actually wrong.
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            `This page is on ${window.location.origin}, which the browser treats as insecure, so it will not allow microphone or camera access. Open the app on http://localhost:5173, or serve it over https.`,
          );
        }

        await r.connect(serverUrl, token);
        // Unmounted while the connection was still being negotiated.
        if (cancelled) {
          await r.disconnect();
          return;
        }

        await r.localParticipant.setMicrophoneEnabled(true);
        // An audio call must not open the camera, on either side. The server
        // token withholds the grant as well; this is the polite half.
        if (mode === "video") {
          await r.localParticipant.setCameraEnabled(true);
        }

        if (!cancelled) setRoom(r);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not connect");
        }
      }
    })();

    return () => {
      cancelled = true;
      // Detached first: tearing down must not fire the handler that tells the
      // console the doctor hung up.
      r.off(RoomEvent.Disconnected, handleDisconnect);
      void r.disconnect();
    };
  }, [serverUrl, token, mode]);

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <div className="font-semibold">This call could not start</div>
        <p className="mt-1 break-words">{error}</p>
      </div>
    );
  }

  // Connecting. The hooks below all read from RoomContext, so there is nothing
  // meaningful to render until the room exists.
  if (!room) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted">
        Connecting…
      </div>
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <div className="flex h-full flex-col gap-2" data-lk-theme="default">
        {mode === "video" ? <VideoTiles /> : <AudioOnly role={role} />}
        {/* Renders every remote audio track. Without it a video call is silent. */}
        <RoomAudioRenderer />
        <ControlBar
          variation="minimal"
          controls={{
            microphone: true,
            camera: mode === "video",
            screenShare: mode === "video" && role === "doctor",
            chat: false,
            leave: true,
          }}
        />
      </div>
    </RoomContext.Provider>
  );
}

function VideoTiles() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout tracks={tracks} className="min-h-0 flex-1">
      <ParticipantTile />
    </GridLayout>
  );
}

/**
 * An audio call still needs to show that the other side is there. The tiles
 * carry the participant name and a speaking indicator, with no video surface.
 */
function AudioOnly({ role }: { role: "doctor" | "patient" }) {
  const tracks = useTracks([{ source: Track.Source.Microphone, withPlaceholder: true }], {
    onlySubscribed: false,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 rounded bg-slate-900 p-4">
      <p className="text-center text-xs text-slate-400">
        Audio call — {role === "doctor" ? "the patient" : "your doctor"} will appear
        below once connected
      </p>
      <GridLayout tracks={tracks} className="max-h-40">
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}
