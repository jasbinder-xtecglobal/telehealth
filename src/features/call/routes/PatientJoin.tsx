/**
 * The patient's end of the call.
 *
 * Public, and deliberately API-free: everything needed to join arrives in the
 * URL fragment, which the browser never sends to a server. There is no
 * unauthenticated endpoint behind this page and nothing here can read a patient
 * record — the token is scoped to one room and carries no clinical claims
 * (invariant 11).
 *
 * It is also outside the app shell. A patient is not signed in and must not see
 * the clinician navigation.
 */
import { Suspense, useMemo, useState } from "react";
import { Spinner } from "@/shared/ui/index.tsx";
import { CALL_STAGES, type CallMode, type CallProviderId } from "../providers/index.ts";

type JoinParams = {
  provider: CallProviderId;
  serverUrl: string;
  token: string;
  mode: CallMode;
};

/** Reads the fragment once. Not reactive — a call link is opened, not navigated. */
function readFragment(): JoinParams | null {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return null;

  const params = new URLSearchParams(raw);
  const provider = params.get("p");
  const serverUrl = params.get("u");
  const token = params.get("t");
  const mode = params.get("m");

  if (!provider || !serverUrl || !token) return null;

  return {
    provider: provider as CallProviderId,
    serverUrl,
    token,
    mode: mode === "video" ? "video" : "audio",
  };
}

export function PatientJoin() {
  const params = useMemo(readFragment, []);
  const [left, setLeft] = useState(false);

  const Stage = params ? CALL_STAGES[params.provider] : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      <header className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">Your consultation</span>
        {params && (
          <span className="text-xs text-slate-400">
            {params.mode === "video" ? "Video call" : "Audio call"}
          </span>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col p-4">
        {!params && (
          <Notice
            title="This link is incomplete"
            body="Open the most recent link your doctor sent you. Links expire, so ask them to send a new one if this keeps happening."
          />
        )}

        {params && !Stage && (
          <Notice
            title="Unsupported call type"
            body="Your doctor's call could not be opened in this browser. Please let them know."
          />
        )}

        {left && (
          <Notice
            title="You have left the call"
            body="You can close this tab. If you were disconnected by mistake, open the link again."
          />
        )}

        {params && Stage && !left && (
          <Suspense fallback={<Spinner />}>
            <Stage
              serverUrl={params.serverUrl}
              token={params.token}
              mode={params.mode}
              role="patient"
              onLeave={() => setLeft(true)}
            />
          </Suspense>
        )}
      </main>

      <footer className="px-4 py-3 text-center text-[11px] text-slate-500">
        If you cannot hear your doctor, check that your browser is allowed to use
        your microphone.
      </footer>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="m-auto max-w-sm rounded-lg bg-slate-800 p-6 text-center">
      <h1 className="text-base font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-300">{body}</p>
    </div>
  );
}
