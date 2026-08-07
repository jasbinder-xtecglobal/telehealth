import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ChatPanel } from "@/features/collaboration/components/ChatPanel.tsx";
import { DispatchBoard } from "@/features/dispatch/routes/DispatchBoard.tsx";
import { AddConsultModal } from "@/features/intake/components/AddConsultModal.tsx";
import { Alert, Button, Chip, Modal, Spinner } from "@/shared/ui/index.tsx";
import { ACUITY_META, CATEGORY_LABELS, waitLabel } from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";

type Channel = "telehealth" | "home_visit" | "nh_telehealth";

const TABS: { key: Channel; label: string }[] = [
  { key: "telehealth", label: "Telehealth" },
  { key: "home_visit", label: "Home Visits" },
  { key: "nh_telehealth", label: "NH Telehealth" },
];

/** Categories a doctor may opt out of seeing. */
const FILTERABLE = [
  "mens_health",
  "womens_health",
  "prescribed_weight_loss",
  "opioids",
  "medical_certificate_only",
] as const;

export function WaitingRoom() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Tab is reflected in the URL so a shift can be handed over with a link.
  const [channel, setChannel] = useState<Channel>(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return TABS.some((x) => x.key === t) ? (t as Channel) : "telehealth";
  });

  const selectChannel = (next: Channel) => {
    setChannel(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  const queue = useQuery({
    ...trpc.queue.list.queryOptions({ channel }),
    refetchInterval: 5_000,
  });
  const filters = useQuery(trpc.doctor.filters.queryOptions());

  // Live push — any queue mutation anywhere invalidates this client's view.
  // `?nosub=1` disables it; the 5s poll above still keeps the queue fresh.
  const liveEnabled =
    typeof window === "undefined" ||
    !new URLSearchParams(window.location.search).has("nosub");

  useSubscription(
    trpc.queue.onChange.subscriptionOptions(undefined, {
      enabled: liveEnabled,
      onData: () => {
        qc.invalidateQueries({ queryKey: trpc.queue.list.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.queue.stats.queryKey() });
      },
    }),
  );

  const claim = useMutation(
    trpc.consult.claim.mutationOptions({
      onSuccess: (res) => navigate(`/consult/${res.consult.id}`),
      onError: (err) => setConflict(err.message),
    }),
  );

  const setFilters = useMutation(
    trpc.doctor.setFilters.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.doctor.filters.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.queue.list.queryKey() });
      },
    }),
  );

  const active = filters.data ?? [];

  const toggle = (cat: string) => {
    const next = active.includes(cat as never)
      ? active.filter((c) => c !== cat)
      : [...active, cat as never];
    setFilters.mutate({ categories: next });
  };

  return (
    <div className="flex h-full">
      <section className="flex min-w-0 flex-1 flex-col">
        {/* header row */}
        <div className="flex shrink-0 items-center gap-3 px-6 pt-4 pb-2">
          <h1 className="text-lg font-semibold">Patients Waiting</h1>
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M7 12h10M11 18h2" />
            </svg>
            Filters
            {active.length > 0 && (
              <span className="ml-1 rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                {active.length}
              </span>
            )}
          </button>
        </div>

        {/* tabs */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6">
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => selectChannel(t.key)}
                className={`border-b-2 px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
                  channel === t.key
                    ? "border-brand text-brand-dark"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 text-sm text-[#2f9e5f] hover:underline"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            Add Consult
          </button>
        </div>

        {/* Home visits are a dispatch problem, not a queue — different board. */}
        {channel === "home_visit" ? (
          <DispatchBoard />
        ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {queue.isLoading && <Spinner />}
          {queue.data?.length === 0 && (
            <p className="py-16 text-center text-sm text-muted">
              No patients waiting in this queue.
            </p>
          )}

          {queue.data?.map((p) => {
            const acuity = ACUITY_META[p.acuity] ?? ACUITY_META[4]!;
            return (
              <button
                key={p.consultId}
                onClick={() => navigate(`/patient/${p.consultId}`)}
                className={`flex w-full items-start gap-3 border-b border-line px-6 py-3 text-left transition-colors hover:bg-slate-50 ${
                  p.isPrivate ? "bg-blue-50/60" : ""
                }`}
              >
                {/* channel icon + family badge */}
                <div className="relative mt-0.5 shrink-0">
                  {p.preference === "video" ? (
                    <svg
                      className={p.concessionCard ? "text-[#2f9e5f]" : "text-muted"}
                      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    >
                      <rect x="2" y="6" width="14" height="12" rx="2" />
                      <path d="m22 8-6 4 6 4V8Z" />
                    </svg>
                  ) : (
                    <svg
                      className={p.concessionCard ? "text-[#2f9e5f]" : "text-muted"}
                      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    >
                      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9Z" />
                    </svg>
                  )}
                  {p.familyMembers.length > 0 && (
                    <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2f9e5f] text-[10px] font-bold text-white">
                      {p.familyMembers.length + 1}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Chip className="border-green-200 bg-green-50 text-green-700">
                      New Patient
                    </Chip>
                    <Chip className={acuity.className}>{acuity.label}</Chip>
                    {p.concessionCard && (
                      <Chip className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Concession
                      </Chip>
                    )}
                    {p.isPrivate && (
                      <Chip className="border-blue-200 bg-blue-50 text-blue-700">
                        Private to you
                      </Chip>
                    )}
                  </div>
                  <div className="text-sm font-semibold">
                    {p.name}, {p.age}, {p.gender}
                    {p.state ? `, ${p.state}` : ""}
                  </div>
                  <div className="truncate text-[13px] text-muted">
                    <span className="text-ink">
                      {CATEGORY_LABELS[p.category] ?? p.category}:
                    </span>{" "}
                    {p.additionalInfo}
                  </div>
                  {p.familyMembers.length > 0 && (
                    <div className="mt-1 text-[11px] text-[#2f9e5f]">
                      + {p.familyMembers.map((f) => f.name).join(", ")} — claimed together
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2 pt-1 text-xs text-muted">
                  {waitLabel(p.requestedAt)}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
        )}
      </section>

      <ChatPanel />

      {/* ---------------- filters ---------------- */}
      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Queue filters"
        width="max-w-lg"
      >
        <p className="mb-3 text-sm text-muted">
          Select the presentations you do <strong>not</strong> wish to see. The
          classifier tags each booking from the patient's own description.
        </p>
        <Alert tone="warn" title="Governance note">
          Opt-outs are recorded against your account and visible to clinical
          governance. Patients you filter remain in the queue for other doctors.
        </Alert>
        <div className="space-y-1">
          {FILTERABLE.map((c) => (
            <label
              key={c}
              className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-2 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={active.includes(c as never)}
                onChange={() => toggle(c)}
                className="h-4 w-4 accent-[#2f7fd1]"
              />
              <span className="text-sm">{CATEGORY_LABELS[c]}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={() => setFiltersOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>

      {/* ---------------- claim conflict ---------------- */}
      <Modal
        open={Boolean(conflict)}
        onClose={() => setConflict(null)}
        title="Patient already claimed"
        width="max-w-md"
      >
        <Alert tone="warn">{conflict}</Alert>
        <p className="mb-4 text-sm text-muted">
          Record locking prevents two doctors consulting the same patient.
        </p>
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setConflict(null)}>
            Back to queue
          </Button>
        </div>
      </Modal>

      <AddConsultModal open={addOpen} onClose={() => setAddOpen(false)} />

      {claim.isPending && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/60">
          <Spinner />
        </div>
      )}
    </div>
  );
}
