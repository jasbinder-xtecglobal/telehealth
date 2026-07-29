import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { clockTime } from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";

type Channel = "clinical" | "dispatcher";

export function ChatPanel() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [channel, setChannel] = useState<Channel>("clinical");
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const me = useQuery(trpc.doctor.me.queryOptions());
  const messages = useQuery({
    ...trpc.chat.list.queryOptions({ channel }),
    refetchInterval: 4_000,
  });

  const send = useMutation(
    trpc.chat.send.mutationOptions({
      onSuccess: () => {
        setDraft("");
        qc.invalidateQueries({ queryKey: trpc.chat.list.queryKey({ channel }) });
      },
    }),
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length, channel]);

  return (
    <aside className="flex w-[310px] shrink-0 flex-col border-l border-line bg-white">
      <div className="flex shrink-0 border-b border-line">
        {(["clinical", "dispatcher"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={`flex-1 border-b-2 px-3 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
              channel === c
                ? "border-brand text-brand-dark"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.data?.length === 0 && (
          <p className="pt-8 text-center text-xs text-muted">
            No messages in this channel yet.
          </p>
        )}
        {messages.data?.map((m) => {
          const mine = m.authorId && m.authorId === me.data?.id;
          return (
            <div key={m.id} className={mine ? "text-right" : ""}>
              <div className="mb-0.5 text-[11px] text-muted">{m.authorName}</div>
              <div
                className={`inline-block max-w-[92%] rounded-md border px-3 py-2 text-left text-[13px] leading-snug ${
                  mine
                    ? "border-blue-100 bg-blue-50"
                    : "border-line bg-white"
                }`}
              >
                {m.body}
              </div>
              <div className="mt-0.5 text-[10px] text-muted">
                {clockTime(m.createdAt)}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        className="flex shrink-0 items-center gap-2 border-t border-line px-3 py-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) send.mutate({ channel, body: draft.trim() });
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            channel === "clinical"
              ? "Message all doctors…"
              : "Message dispatch…"
          }
          className="min-w-0 flex-1 rounded border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={!draft.trim() || send.isPending}
          className="text-brand-dark disabled:text-slate-300"
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m22 2-7 20-4-9-9-4Z" />
          </svg>
        </button>
      </form>
    </aside>
  );
}
