import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Button, Chip, Empty, Spinner } from "@/shared/ui/index.tsx";
import { money, shortDate } from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";

function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <h1 className="text-lg font-semibold">{title}</h1>
      {subtitle && <p className="mb-4 text-sm text-muted">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Inbox — ordered investigations awaiting acknowledgement
 * ------------------------------------------------------------------ */
export function Inbox() {
  const trpc = useTRPC();
  const qc = useQueryClient();
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
      subtitle="Investigations you ordered. Follow-up is your responsibility — unacknowledged results escalate to clinical governance."
    >
      {inbox.isLoading && <Spinner />}
      {inbox.data?.length === 0 && <Empty>Your inbox is empty.</Empty>}

      <div className="divide-y divide-line rounded-lg border border-line">
        {inbox.data?.map((i) => (
          <div key={i.id} className="flex items-start justify-between px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold capitalize">{i.type}</span>
                {i.isAbnormal && (
                  <Chip className="border-red-200 bg-red-50 text-red-700">Abnormal</Chip>
                )}
                <Chip className="border-slate-200 bg-slate-100 text-slate-600">
                  {i.status}
                </Chip>
              </div>
              <div className="text-sm">{i.tests}</div>
              <div className="text-xs text-muted">
                Ordered {shortDate(i.createdAt)}
                {i.copyToGp ? " Â· copied to usual GP" : ""}
              </div>
            </div>
            <Button
              variant="success"
              onClick={() => ack.mutate({ investigationId: i.id })}
            >
              Acknowledge
            </Button>
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
  const [incomplete, setIncomplete] = useState(false);
  const [days, setDays] = useState<number | null>(7);

  const history = useQuery(
    trpc.consult.history.queryOptions({ onlyIncompleteBilling: incomplete, days }),
  );

  return (
    <Page title="Consult History">
      <div className="mb-3 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={incomplete}
            onChange={(e) => setIncomplete(e.target.checked)}
            className="h-4 w-4 accent-[#2f7fd1]"
          />
          Billing incomplete only
        </label>
        <div className="flex gap-1">
          {[
            { l: "Last 7 days", v: 7 as number | null },
            { l: "All", v: null },
          ].map((o) => (
            <button
              key={o.l}
              onClick={() => setDays(o.v)}
              className={`rounded border px-2.5 py-1 text-xs ${
                days === o.v ? "border-brand bg-slate-50 text-brand-dark" : "border-line text-muted"
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {history.isLoading && <Spinner />}
      {history.data?.length === 0 && <Empty>No consults in this period.</Empty>}

      <div className="overflow-hidden rounded-lg border border-line">
        {history.data?.map((h) => (
          <div
            key={h.id}
            className={`flex items-center justify-between border-b border-line px-4 py-2.5 last:border-0 ${
              h.hasNotes ? "" : "bg-amber-50"
            }`}
            title={h.hasNotes ? undefined : "No notes written for this consult"}
          >
            <div>
              <div className="text-sm font-medium">{h.patientName}</div>
              <div className="text-xs text-muted">{shortDate(h.endedAt)}</div>
            </div>
            <div className="flex items-center gap-3">
              {!h.hasNotes && (
                <Chip className="border-amber-300 bg-amber-100 text-amber-800">
                  Notes missing
                </Chip>
              )}
              <Chip className="border-slate-200 bg-slate-100 text-slate-600">
                {h.billingStatus}
              </Chip>
              <span className="w-20 text-right text-sm font-semibold text-[#2f9e5f]">
                {money(h.fee)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ *
 * Billing + SMS outbox
 * ------------------------------------------------------------------ */
export function Billing() {
  const trpc = useTRPC();
  const history = useQuery(
    trpc.consult.history.queryOptions({ onlyIncompleteBilling: false, days: null }),
  );
  const sms = useQuery(trpc.doctor.smsOutbox.queryOptions());

  const total = history.data?.reduce((s, h) => s + h.fee, 0) ?? 0;

  return (
    <Page title="Billing" subtitle="Consultations are batched to Medicare daily at 11 am.">
      <div className="mb-6 rounded-lg border border-line p-4">
        <div className="text-xs text-muted">Total billed, all time</div>
        <div className="text-2xl font-bold text-[#2f9e5f]">{money(total)}</div>
      </div>

      <h2 className="mb-2 text-sm font-semibold">Patient delivery log</h2>
      <p className="mb-3 text-xs text-muted">
        Everything the platform sent to a patient. Artefacts only appear here
        after their consult was closed.
      </p>
      {sms.data?.length === 0 && <Empty>Nothing sent yet.</Empty>}
      <div className="divide-y divide-line rounded-lg border border-line">
        {sms.data?.map((m, i) => (
          <div key={i} className="px-4 py-2.5">
            <div className="text-xs text-muted">
              To {m.to} Â· {new Date(m.sentAt).toLocaleTimeString("en-AU")}
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
    </Page>
  );
}

/* ------------------------------------------------------------------ *
 * Support
 * ------------------------------------------------------------------ */
export function Support() {
  return (
    <Page title="Support">
      <Alert tone="warn" title="Reference behaviour flagged for change">
        The reference software gates this page behind a single shared password
        distributed over WhatsApp. A production build should use the same
        authenticated session as the rest of the console.
      </Alert>
      <div className="rounded-lg border border-line p-4 text-sm">
        <p className="mb-2">Support channels:</p>
        <ul className="ml-4 list-disc text-muted">
          <li>Clinical escalation — dispatcher chat in the waiting room</li>
          <li>Technical issues — support desk</li>
          <li>Credentialing and onboarding — practice administration</li>
        </ul>
      </div>
    </Page>
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
