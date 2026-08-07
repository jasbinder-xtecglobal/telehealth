import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Chip, Spinner } from "@/shared/ui/index.tsx";
import { shortDate } from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";

/**
 * The left column of the consult console.
 *
 * Two tabs over one stack of supporting information: the cross-consult
 * summary, and the management plan the scribe drafted. Templates and Results
 * sit above both because they are used from either.
 */
export function ClinicalSidebar({
  consultId,
  aiSummary,
  priorConsultCount,
  onInsertTemplate,
}: {
  consultId: string;
  aiSummary: string;
  priorConsultCount: number;
  onInsertTemplate: (body: string) => void;
}) {
  const [tab, setTab] = useState<"summary" | "plan">("summary");

  return (
    <div className="rounded-lg border border-line">
      <div className="flex border-b border-line">
        <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>
          Patient Summary
        </TabButton>
        <TabButton active={tab === "plan"} onClick={() => setTab("plan")}>
          AI Management Plan
        </TabButton>
      </div>

      <Templates consultId={consultId} onInsert={onInsertTemplate} />
      <Results consultId={consultId} />

      <div className="px-3 py-3">
        {tab === "summary" ? (
          <>
            <div className="mb-1.5 text-sm font-semibold">
              AI Patient Summary{" "}
              <span className="text-[10px] font-normal text-orange-600">
                (beta)
              </span>
            </div>
            <pre className="text-[12.5px] leading-relaxed whitespace-pre-wrap">
              {aiSummary}
            </pre>
            {priorConsultCount > 0 && (
              <p className="mt-2 text-[11px] text-muted">
                Generated from {priorConsultCount} previous consult
                {priorConsultCount === 1 ? "" : "s"}. Always confirm against the
                source notes.
              </p>
            )}
          </>
        ) : (
          <ManagementPlan consultId={consultId} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 border-b-2 px-3 py-2.5 text-[11px] font-semibold tracking-wide uppercase transition-colors ${
        active
          ? "border-[#2f7fd1] text-[#2f7fd1]"
          : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** A disclosure row styled like the reference console's `Templates ›`. */
function Disclosure({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <details className="border-b border-line">
      <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm hover:bg-slate-50">
        <span className="flex items-center gap-2">
          {label}
          {count !== undefined && count > 0 && (
            <span className="text-[11px] text-muted">({count})</span>
          )}
        </span>
        <svg
          className="text-muted"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </summary>
      <div className="border-t border-line bg-slate-50/60">{children}</div>
    </details>
  );
}

function Templates({
  consultId,
  onInsert,
}: {
  consultId: string;
  onInsert: (body: string) => void;
}) {
  const trpc = useTRPC();
  const templates = useQuery(trpc.doctor.templates.queryOptions());
  void consultId;

  return (
    <Disclosure label="Templates" count={templates.data?.length}>
      {templates.data?.length === 0 && (
        <p className="px-3 py-2.5 text-xs text-muted">
          No templates yet — add one from My Account.
        </p>
      )}
      {templates.data?.map((t) => (
        <button
          key={t.id}
          onClick={() => onInsert(t.body)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-white"
        >
          <span>{t.name}</span>
          {t.isDefault && (
            <span className="text-[10px] font-semibold text-[#2f9e5f] uppercase">
              default
            </span>
          )}
        </button>
      ))}
    </Disclosure>
  );
}

function Results({ consultId }: { consultId: string }) {
  const trpc = useTRPC();
  const [sort, setSort] = useState<"date" | "type">("date");
  const results = useQuery(trpc.consult.patientResults.queryOptions({ consultId }));

  const rows = [...(results.data ?? [])].sort((a, b) =>
    sort === "type"
      ? a.type.localeCompare(b.type) ||
        new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
      : new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
  );

  return (
    <Disclosure label="Results" count={rows.length}>
      {results.isLoading && <Spinner />}

      {rows.length > 0 && (
        <div className="flex items-center gap-2 px-3 pt-2 text-[11px] text-muted">
          List by
          {(["date", "type"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={sort === k ? "font-semibold text-[#2f7fd1]" : "hover:text-ink"}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {!results.isLoading && rows.length === 0 && (
        <p className="px-3 py-2.5 text-xs text-muted">
          No investigations recorded for this patient.
        </p>
      )}

      {rows.map((r) => (
        <div key={r.id} className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium capitalize">{r.type}</span>
            {r.pending && (
              <Chip className="border-slate-200 bg-slate-100 text-slate-600">
                Pending
              </Chip>
            )}
            {r.isAbnormal && (
              <Chip className="border-red-200 bg-red-50 text-red-700">
                Abnormal
              </Chip>
            )}
            {r.fromThisConsult && (
              <span className="text-[10px] text-muted">this consult</span>
            )}
          </div>
          <div className="text-[13px]">{r.tests}</div>
          <div className="text-[11px] text-muted">
            Ordered {shortDate(r.orderedAt)}
            {r.resultedAt ? ` · resulted ${shortDate(r.resultedAt)}` : ""}
          </div>
          {r.resultBody && (
            <p className="mt-0.5 text-[12px] text-muted">{r.resultBody}</p>
          )}
        </div>
      ))}
    </Disclosure>
  );
}

/**
 * The plan the scribe drafted, taken from the note revision that produced it
 * so the model that wrote it travels with the text (invariant 5). Nothing is
 * generated here — if the scribe has not run, the tab says so.
 */
function ManagementPlan({ consultId }: { consultId: string }) {
  const trpc = useTRPC();
  const revisions = useQuery(trpc.consult.revisions.queryOptions({ consultId }));

  const drafted = revisions.data?.find((r) => r.aiGenerated);

  if (revisions.isLoading) return <Spinner />;

  if (!drafted) {
    return (
      <p className="text-[13px] text-muted">
        No AI-drafted note for this consult. Capture a consented transcript and
        run <strong className="text-ink">AI Scribe</strong> from the notes
        toolbar, and the plan it writes appears here.
      </p>
    );
  }

  return (
    <>
      <div className="mb-1.5 text-sm font-semibold">Management plan</div>
      <pre className="text-[12.5px] leading-relaxed whitespace-pre-wrap">
        {planSection(drafted.body)}
      </pre>
      <p className="mt-2 text-[11px] text-muted">
        Drafted {shortDate(drafted.createdAt)} by{" "}
        <span className="font-mono">{drafted.aiModel}</span>. Reviewed and
        attested by the treating doctor before release.
      </p>
    </>
  );
}

/**
 * Pulls the plan out of a structured note. Falls back to the whole note when
 * the template has no plan heading — showing everything is safer than showing
 * nothing and implying there is no plan.
 */
function planSection(body: string): string {
  const match = body.match(/^\s*(plan|management plan)\s*:?\s*$/im);
  if (!match || match.index === undefined) return body;
  return body.slice(match.index + match[0].length).trim() || body;
}
