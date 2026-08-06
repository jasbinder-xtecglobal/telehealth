/**
 * "Which platform do you want to use?"
 *
 * The list comes from the server — installed adapters, and for each one whether
 * it can carry this call right now. The client renders that answer and does not
 * re-derive it, the same way the close checklist does. Adding a vendor changes
 * nothing in this file.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal, Spinner } from "@/shared/ui/index.tsx";
import { useTRPC } from "@/shared/lib/trpc.ts";
import type { CallMode } from "../providers/index.ts";
import type { ActiveCall } from "../types.ts";

export function CallProviderModal({
  consultId,
  mode,
  open,
  onClose,
  onStarted,
}: {
  consultId: string;
  mode: CallMode;
  open: boolean;
  onClose: () => void;
  onStarted: (call: ActiveCall) => void;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const options = useQuery({
    ...trpc.calls.options.queryOptions({ consultId, mode }),
    enabled: open,
  });

  const start = useMutation(
    trpc.calls.start.mutationOptions({
      onSuccess: (call) => {
        void qc.invalidateQueries({ queryKey: trpc.calls.options.queryKey() });
        onStarted(call);
        onClose();
      },
    }),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "video" ? "Start a video call" : "Call the patient"}
      width="max-w-lg"
    >
      <p className="mb-4 text-sm text-muted">
        Choose the platform to carry this call. All four are being trialled — pick
        whichever you want to assess.
      </p>

      {options.isLoading && <Spinner />}

      <div className="space-y-2">
        {options.data?.options.map((o) => (
          <button
            key={o.id}
            disabled={!o.available || start.isPending}
            onClick={() =>
              start.mutate({ consultId, provider: o.id, mode })
            }
            className={`flex w-full items-center justify-between rounded border px-4 py-3 text-left transition-colors ${
              o.available
                ? "border-line bg-white hover:border-[#2f7fd1] hover:bg-blue-50"
                : "cursor-not-allowed border-line bg-slate-50"
            }`}
          >
            <span>
              <span
                className={`block text-sm font-semibold ${o.available ? "" : "text-slate-400"}`}
              >
                {o.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {o.available
                  ? `${o.modes.join(" and ")} supported`
                  : o.unavailableReason}
              </span>
              {/* Dev-phase affordance: an unconfigured vendor says exactly which
                  variables are missing, so the fix is obvious. */}
              {!o.configured && o.configHint && (
                <span className="mt-1 block font-mono text-[11px] text-slate-400">
                  {o.configHint}
                </span>
              )}
            </span>

            {o.available && (
              <span className="shrink-0 text-xs font-medium text-[#2f7fd1]">
                {start.isPending ? "Starting…" : "Start"}
              </span>
            )}
          </button>
        ))}

        {options.data?.options.length === 0 && (
          <p className="rounded border border-dashed border-line p-4 text-center text-sm text-muted">
            No call providers are installed.
          </p>
        )}
      </div>

      {start.error && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {start.error.message}
        </p>
      )}
    </Modal>
  );
}
