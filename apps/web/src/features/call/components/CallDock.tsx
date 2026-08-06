/**
 * The doctor's call surface.
 *
 * Vendor-agnostic: it looks the provider up in `CALL_STAGES` and renders it.
 * The dock owns the chrome — who is on the call, the patient's join link, and
 * hanging up — because all four vendors need exactly that and none of them
 * should own it.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Button, Spinner } from "@/shared/ui/index.tsx";
import { useTRPC } from "@/shared/lib/trpc.ts";
import { CALL_STAGES } from "../providers/index.ts";
import type { ActiveCall } from "../types.ts";

export function CallDock({
  consultId,
  call,
  onEnded,
}: {
  consultId: string;
  call: ActiveCall;
  onEnded: () => void;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const end = useMutation(
    trpc.calls.end.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.calls.options.queryKey() });
        onEnded();
      },
    }),
  );

  const Stage = CALL_STAGES[call.provider];

  const hangUp = () => end.mutate({ consultId });

  const copyLink = async () => {
    await navigator.clipboard.writeText(call.patientJoinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-0 flex-col border-b border-line bg-slate-50">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-semibold">
          <span className="inline-block h-2 w-2 rounded-full bg-[#2f9e5f]" />
          {call.mode === "video" ? "Video" : "Audio"} call
          <span className="font-normal text-muted">via {call.provider}</span>
        </span>
        <Button
          variant="danger"
          className="!py-1 text-xs"
          disabled={end.isPending}
          onClick={hangUp}
        >
          Hang up
        </Button>
      </div>

      <div className="h-64 min-h-0 px-3">
        {Stage ? (
          <Suspense fallback={<Spinner />}>
            <Stage
              serverUrl={call.doctor.serverUrl}
              token={call.doctor.token}
              mode={call.mode}
              role="doctor"
              onLeave={hangUp}
            />
          </Suspense>
        ) : (
          <p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            The server started a {call.provider} call, but this build has no
            {" "}
            {call.provider} stage to render it.
          </p>
        )}
      </div>

      {/* No patient app exists yet, so the link is handed over by hand. When one
          does, this is what the SMS carries. */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Button variant="outline" className="!py-1 flex-1 text-xs" onClick={copyLink}>
          {copied ? "Link copied" : "Copy patient join link"}
        </Button>
        <a
          href={call.patientJoinUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-line bg-white px-3 py-1 text-xs font-medium hover:bg-slate-50"
        >
          Open as patient
        </a>
      </div>
    </div>
  );
}
