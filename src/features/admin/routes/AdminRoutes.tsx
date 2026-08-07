import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button, Chip, Empty, Spinner } from "@/shared/ui/index.tsx";
import {
  CATEGORY_LABELS,
  ageFromDob,
  money,
  shortDate,
} from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";

function Page({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-lg font-semibold">{title}</h1>
        {actions}
      </div>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** `Name, 47, Female, 139 Macorna St Watsonia North VIC 3087` */
function patientLine(p: {
  patientName: string;
  dob: string;
  gender: string | null;
  addressLine: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
}): string {
  const address = [p.addressLine, p.suburb, p.state, p.postcode]
    .filter(Boolean)
    .join(" ");
  const gender = p.gender
    ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1)
    : null;
  return [p.patientName, ageFromDob(p.dob), gender, address]
    .filter((x) => x !== null && x !== "")
    .join(", ");
}

function NoteIcon() {
  return (
    <svg
      className="mt-0.5 shrink-0 text-muted"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 21l2-4.9A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Inbox — investigations awaiting acknowledgement
 * ------------------------------------------------------------------ */
export function Inbox() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const inbox = useQuery(trpc.doctor.inbox.queryOptions());
  const ack = useMutation(
    trpc.consult.acknowledgeInvestigation.mutationOptions({
      onSuccess: () =>
        qc.invalidateQueries({ queryKey: trpc.doctor.inbox.queryKey() }),
    }),
  );

  return (
    <Page
      title="Inbox"
      subtitle="Investigations you ordered. Follow-up is your responsibility — copying the usual GP does not transfer it."
    >
      {inbox.isLoading && <Spinner />}
      {inbox.data?.length === 0 && <Empty>Your inbox is empty.</Empty>}

      <div className="divide-y divide-line">
        {inbox.data?.map((i) => (
          <div key={i.id} className="flex items-start gap-4 py-4">
            <NoteIcon />

            <button
              onClick={() => navigate(`/patient/${i.consultId}`)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="text-sm font-semibold">{patientLine(i)}</div>
              <div className="mt-0.5 text-xs text-muted">
                {shortDate(i.orderedAt)}
              </div>
              {i.requestText && (
                <p className="mt-1 text-sm">{i.requestText}</p>
              )}
              <div className="mt-1 text-sm text-[#d13c31]">
                - {i.type === "pathology" ? "Pathology" : "Radiology"}: {i.tests}
              </div>
            </button>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex items-center gap-1.5">
                {i.isAbnormal && (
                  <Chip className="border-red-200 bg-red-50 text-red-700">
                    Abnormal
                  </Chip>
                )}
                <Chip className="border-slate-200 bg-slate-100 text-slate-600">
                  {i.status}
                </Chip>
              </div>
              <Button
                variant="success"
                className="!py-1 text-xs"
                disabled={ack.isPending}
                onClick={() => ack.mutate({ investigationId: i.id })}
              >
                Acknowledge
              </Button>
              {i.copyToGp && (
                <span className="text-[10px] text-muted">copied to usual GP</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ *
 * Consult history
 * ------------------------------------------------------------------ */
export function ConsultHistory() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const [incomplete, setIncomplete] = useState(false);
  const [lastSeven, setLastSeven] = useState(true);

  const history = useQuery(
    trpc.consult.history.queryOptions({
      onlyIncompleteBilling: incomplete,
      days: lastSeven ? 7 : null,
    }),
  );

  return (
    <Page
      title="Consult History"
      actions={
        <div className="flex items-center gap-5">
          <Check
            label="Billing incomplete only"
            checked={incomplete}
            onChange={setIncomplete}
          />
          <Check
            label="Show last 7 days"
            checked={lastSeven}
            onChange={setLastSeven}
          />
        </div>
      }
    >
      <p className="-mt-2 mb-3 text-sm">
        Number of consultations today (midnight to midnight):{" "}
        <strong>{history.data?.todayCount ?? 0}</strong>
      </p>

      {history.isLoading && <Spinner />}
      {history.data?.items.length === 0 && (
        <Empty>No consults in this period.</Empty>
      )}

      <div className="divide-y divide-line">
        {history.data?.items.map((h) => (
          <button
            key={h.id}
            onClick={() => navigate(`/consult/${h.id}`)}
            className={`flex w-full items-start gap-4 px-2 py-3.5 text-left transition-colors hover:bg-slate-50 ${
              h.billingIncomplete ? "bg-amber-50" : ""
            }`}
            title={
              h.billingIncomplete ? "Billing not yet submitted" : undefined
            }
          >
            <NoteIcon />

            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{patientLine(h)}</div>
              <div className="mt-0.5 text-xs text-muted">
                {shortDate(h.endedAt)}
              </div>
              {h.requestText && <p className="mt-1 text-sm">{h.requestText}</p>}
              <div className="mt-1 text-xs text-muted">
                {CATEGORY_LABELS[h.category] ?? h.category}
                {h.itemNumbers.length > 0 && ` · ${h.itemNumbers.join(", ")}`}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {!h.hasNotes && (
                <Chip className="border-amber-300 bg-amber-100 text-amber-800">
                  Notes missing
                </Chip>
              )}
              <span className="w-20 text-right text-sm font-semibold text-[#2f9e5f]">
                {money(h.fee)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ *
 * Billing history
 * ------------------------------------------------------------------ */

/** Local YYYY-MM-DD. `toISOString` would shift the date across midnight. */
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function shiftDays(value: string, days: number): string {
  const d = new Date(`${value}T00:00:00`);
  d.setDate(d.getDate() + days);
  return iso(d);
}

function longDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function Billing() {
  const trpc = useTRPC();
  const navigate = useNavigate();

  const today = iso(new Date());
  const [start, setStart] = useState(() => shiftDays(today, -365));
  const [end, setEnd] = useState(today);
  const [showLog, setShowLog] = useState(false);

  const statement = useQuery(
    trpc.consult.billingStatement.queryOptions({ start, end }),
  );
  const sms = useQuery({
    ...trpc.doctor.smsOutbox.queryOptions(),
    enabled: showLog,
  });

  // Step the whole window, keeping its length, so paging never inverts it.
  const span = Math.max(
    1,
    Math.round(
      (new Date(`${end}T00:00:00`).getTime() -
        new Date(`${start}T00:00:00`).getTime()) /
        86_400_000,
    ),
  );
  const step = (days: number) => {
    setStart(shiftDays(start, days));
    setEnd(shiftDays(end, days));
  };

  return (
    <Page
      title="Billing History"
      actions={
        <div className="flex items-end gap-2">
          <Stepper label="«" title="Back one window" onClick={() => step(-span)} />
          <Stepper label="‹" title="Back one week" onClick={() => step(-7)} />
          <DateField label="Start" value={start} onChange={setStart} />
          <span className="pb-2 text-sm text-muted">to</span>
          <DateField label="End" value={end} onChange={setEnd} />
          <Stepper label="›" title="Forward one week" onClick={() => step(7)} />
          <Stepper
            label="»"
            title="Forward one window"
            onClick={() => step(span)}
          />
        </div>
      }
    >
      {statement.isLoading && <Spinner />}
      {statement.isError && (
        <Alert tone="danger">{statement.error.message}</Alert>
      )}
      {statement.data?.weeks.length === 0 && (
        <Empty>No closed consults in this range.</Empty>
      )}

      <div className="space-y-3">
        {statement.data?.weeks.map((w) => (
          <details key={w.weekStart} open className="rounded-lg border border-line">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-semibold">
                  Week of {longDate(w.weekStart)} to {longDate(w.weekEnd)}
                </div>
                <div className="text-sm text-muted">
                  Total consultations: <strong>{w.consultCount}</strong>
                </div>
              </div>
              <span className="text-lg font-semibold">{money(w.total)}</span>
            </summary>

            <div className="space-y-2 px-3 pb-3">
              {w.days.map((d) => (
                <details key={d.date} className="rounded-lg bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold">
                        {longDate(d.date)}
                      </div>
                      <div className="text-sm text-muted">
                        Total consultations: <strong>{d.consultCount}</strong>
                      </div>
                    </div>
                    <span className="font-semibold">{money(d.total)}</span>
                  </summary>

                  <div className="space-y-1.5 px-3 pb-3">
                    {d.lines.map((l) => (
                      <button
                        key={l.consultId}
                        onClick={() => navigate(`/consult/${l.consultId}`)}
                        className="flex w-full items-center gap-4 rounded bg-white px-4 py-3 text-left hover:bg-slate-100"
                      >
                        <NoteIcon />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">
                            {l.patientName}, {ageFromDob(l.dob)}
                          </div>
                          <div className="text-xs text-muted">
                            {shortDate(l.endedAt)}
                          </div>
                          <div className="text-sm font-medium">
                            {CATEGORY_LABELS[l.category] ?? l.category}
                          </div>
                          <div className="text-xs text-muted">
                            {l.itemNumbers.length > 0
                              ? l.itemNumbers.join(", ")
                              : "No billing recorded"}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {l.billed ? (
                            <svg
                              className="text-[#2f9e5f]"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <circle cx="12" cy="12" r="9" />
                              <path d="m8.5 12 2.5 2.5 4.5-5" />
                            </svg>
                          ) : (
                            <Chip className="border-slate-200 bg-slate-100 text-slate-600">
                              Not billed
                            </Chip>
                          )}
                          <span className="w-20 text-right text-sm font-semibold text-[#2f9e5f]">
                            {money(l.fee)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>

      {/* Proves invariant 1 — nothing is sent before a consult closes. */}
      <div className="mt-8 border-t border-line pt-4">
        <button
          onClick={() => setShowLog((v) => !v)}
          className="text-sm text-[#2f7fd1] hover:underline"
        >
          {showLog ? "Hide" : "Show"} patient delivery log
        </button>
        {showLog && (
          <>
            <p className="mt-2 mb-3 text-xs text-muted">
              Everything the platform sent to a patient. Artefacts only appear
              here after their consult was closed.
            </p>
            {sms.data?.length === 0 && <Empty>Nothing sent yet.</Empty>}
            <div className="divide-y divide-line rounded-lg border border-line">
              {sms.data?.map((m, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="text-xs text-muted">
                    To {m.to} · {new Date(m.sentAt).toLocaleTimeString("en-AU")}
                  </div>
                  <div className="text-sm">{m.body}</div>
                  {m.links.map((l, j) => (
                    <div key={j} className="font-mono text-[12px] text-[#2f7fd1]">
                      {l}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Page>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] text-muted">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="border-b border-line bg-transparent py-1 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}

function Stepper({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="pb-1 text-lg text-muted hover:text-ink"
    >
      {label}
    </button>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#2f7fd1]"
      />
      {label}
    </label>
  );
}

/* ------------------------------------------------------------------ *
 * Panic button
 * ------------------------------------------------------------------ */
export function PanicButton() {
  const [sent, setSent] = useState(false);

  return (
    <Page title="Panic Button">
      <div className="mx-auto max-w-lg pt-10 text-center">
        <p className="mb-5 text-sm">
          By pressing the panic button, your location will be shared with the
          call centre.
        </p>
        <Button
          variant="danger"
          onClick={() => setSent(true)}
          className="!px-6 !py-2.5"
        >
          Press panic button
        </Button>
        {sent && (
          <div className="mt-5">
            <Alert tone="danger" title="Alert raised">
              Dispatch has been notified with your last known location.
            </Alert>
          </div>
        )}
        <div className="mt-8 text-left">
          <Alert tone="warn" title="Recommended addition">
            A panic button is reactive and needs a free hand. Home-visit doctors
            should also have an arrival check-in with an automatic escalation if
            they do not check out.
          </Alert>
        </div>
      </div>
    </Page>
  );
}
