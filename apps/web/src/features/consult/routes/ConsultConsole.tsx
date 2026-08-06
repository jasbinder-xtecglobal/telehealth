import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CallDock } from "@/features/call/components/CallDock.tsx";
import { CallProviderModal } from "@/features/call/components/CallProviderModal.tsx";
import type { CallMode } from "@/features/call/providers/index.ts";
import type { ActiveCall } from "@/features/call/types.ts";
import {
  AddFamilyModal,
  BillModal,
  DocumentModal,
  InvestigateModal,
  PrescribeModal,
  ReferModal,
} from "@/features/consult/components/ActionModals.tsx";
import { ClinicalSidebar } from "@/features/consult/components/ClinicalSidebar.tsx";
import {
  Alert,
  Button,
  Chip,
  Field,
  Modal,
  Select,
  Spinner,
  Textarea,
} from "@/shared/ui/index.tsx";
import { DOCUMENT_LABELS, money, shortDate } from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";

const SAMPLE_TRANSCRIPT = `Doctor: Hello, it's the after hours doctor calling. Can I confirm your name and date of birth?
Patient: Yes, that's right.
Doctor: What's been happening?
Patient: I've been to Bali and I've felt unwell. I've had diarrhoea for two days, opening my bowels about ten times a day. No blood in my stool. No fevers.
Doctor: Are you keeping fluids down?
Patient: Yes, I'm off my food but I can keep fluids down.
Doctor: Any medical problems, any regular medications?
Patient: No medical problems, I don't take any medications. I'm not a smoker.
Doctor: It sounds like traveller's diarrhoea. Keep your fluids up. If you're getting blood in your stools, or if it goes on for more than five days, or you're getting very dehydrated, please seek attention. We can give you a medical certificate for work as well if you need it.`;

type ActionKey = "prescribe" | "refer" | "investigate" | "document" | "bill";

export function ConsultConsole() {
  const { consultId = "" } = useParams();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [openAction, setOpenAction] = useState<ActionKey | null>(null);
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const [consent, setConsent] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  // Which mode the picker was opened for, and the call it produced. The
  // credentials are deliberately not cached anywhere — a refresh ends the call
  // rather than replaying a stale token.
  const [pickingCall, setPickingCall] = useState<CallMode | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [endResult, setEndResult] = useState<{ links: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consult = useQuery({
    ...trpc.consult.get.queryOptions({ consultId }),
    refetchInterval: 8_000,
  });
  const templates = useQuery(trpc.doctor.templates.queryOptions());

  const c = consult.data;

  // Load server notes once, and whenever the server copy changes underneath.
  useEffect(() => {
    if (c && !dirty) setNotes(c.notes ?? "");
  }, [c?.notes, c?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!templateId && templates.data?.length) {
      const def = templates.data.find((t) => t.isDefault) ?? templates.data[0];
      if (def) setTemplateId(def.id);
    }
  }, [templates.data, templateId]);

  const refresh = () =>
    qc.invalidateQueries({ queryKey: trpc.consult.get.queryKey({ consultId }) });

  const start = useMutation(trpc.consult.start.mutationOptions({ onSuccess: refresh }));
  const saveNotes = useMutation(
    trpc.consult.saveNotes.mutationOptions({
      onSuccess: () => {
        setDirty(false);
        refresh();
      },
    }),
  );
  const attest = useMutation(
    trpc.consult.attestNotes.mutationOptions({
      onSuccess: refresh,
      onError: (e) => setError(e.message),
    }),
  );
  const captureTranscript = useMutation(
    trpc.consult.captureTranscript.mutationOptions({ onSuccess: refresh }),
  );
  const runScribe = useMutation(
    trpc.consult.runScribe.mutationOptions({
      onSuccess: (res) => {
        setNotes(res.body);
        setDirty(false);
        refresh();
      },
      onError: (e) => setError(e.message),
    }),
  );
  const nudge = useMutation(trpc.consult.nudgePatient.mutationOptions());
  const patientJoin = useMutation(
    trpc.consult.patientJoin.mutationOptions({ onSuccess: refresh }),
  );
  const requeue = useMutation(
    trpc.consult.requeue.mutationOptions({ onSuccess: () => navigate("/") }),
  );
  const end = useMutation(
    trpc.consult.end.mutationOptions({
      onSuccess: (res) => {
        setEndResult({ links: res.links });
        qc.invalidateQueries({ queryKey: trpc.queue.list.queryKey() });
      },
      onError: (e) => setError(e.message),
    }),
  );

  if (consult.isLoading) return <Spinner />;
  if (!c) return <Alert tone="danger">Consult not found.</Alert>;

  const age = new Date().getFullYear() - new Date(c.patient.dob).getFullYear();
  const attested = Boolean(c.notesAttestedAt);
  const hasBilling = c.billings.length > 0;
  const artefactCount =
    c.prescriptions.filter((p) => p.status === "draft").length +
    c.referrals.filter((r) => r.status === "draft").length +
    c.investigations.filter((i) => i.status === "ordered").length +
    c.documents.filter((d) => d.status === "draft").length;

  const canEnd = attested && hasBilling && Boolean(notes.trim());

  const ACTIONS: {
    key: ActionKey;
    label: string;
    color: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "prescribe", label: "Prescribe", color: "text-[#2f9e5f] border-[#2f9e5f]",
      icon: <path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7ZM7 10l7 7" />,
    },
    {
      key: "refer", label: "Refer", color: "text-[#7c4dbd] border-[#7c4dbd]",
      icon: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    },
    {
      key: "investigate", label: "Investigate", color: "text-[#d13c31] border-[#d13c31]",
      icon: <path d="M9 3v6l-5 8a3 3 0 0 0 2.6 4.5h10.8A3 3 0 0 0 20 17l-5-8V3M9 3h6M7.5 14h9" />,
    },
    {
      key: "document", label: "Document", color: "text-[#e0891f] border-[#e0891f]",
      icon: <><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" /><path d="M14 2v5h5M9 13h6M9 17h4" /></>,
    },
    {
      key: "bill", label: "Bill", color: "text-[#2f7fd1] border-[#2f7fd1]",
      icon: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M12 10v4M10 12h4" /></>,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* ---------------- header ---------------- */}
      <div className="flex shrink-0 items-center gap-4 border-b border-line px-5 py-2.5">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-[#2f7fd1] hover:underline"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold underline decoration-line underline-offset-2">
            {c.patient.firstName} {c.patient.lastName}, {age}, {c.patient.gender},{" "}
            {c.patient.phone}
          </div>
          <div className="truncate text-xs text-muted">
            {c.patient.addressLine}, {c.patient.suburb}, {c.patient.state},{" "}
            {c.patient.postcode}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Chip
            className={
              c.status === "in_consult"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-slate-200 bg-slate-100 text-slate-600"
            }
          >
            {c.status.replace(/_/g, " ")}
          </Chip>
          <Button
            className="!text-[#2f9e5f]"
            onClick={() => setFamilyOpen(true)}
          >
            Add family
          </Button>
          <Button onClick={() => requeue.mutate({ consultId })}>Requeue</Button>
          <Button variant="danger" onClick={() => setEndOpen(true)}>
            End
          </Button>
        </div>
      </div>

      {c.status === "claimed" && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span>
              Consult claimed but not started. Starting sends the patient a join
              link by SMS.
            </span>
            <Button variant="primary" onClick={() => start.mutate({ consultId })}>
              Start consult
            </Button>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)_340px]">
        {/* ============ LEFT ============ */}
        <div className="min-h-0 overflow-y-auto border-r border-line p-3">
          <div className="mb-3 rounded-lg border border-line p-3">
            <div className="mb-1 text-xs font-semibold tracking-wide uppercase text-muted">
              Allergies
            </div>
            {c.allergies.length === 0 ? (
              <p className="text-sm text-muted">Not recorded</p>
            ) : (
              <ul className="space-y-1">
                {c.allergies.map((a) => (
                  <li key={a.id} className="text-sm">
                    {a.isNkda ? (
                      <span className="text-muted">NKDA</span>
                    ) : (
                      <span className="font-medium text-red-700">
                        {a.substance}
                        {a.reaction && (
                          <span className="font-normal text-muted"> — {a.reaction}</span>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mb-3">
            <ClinicalSidebar
              consultId={consultId}
              aiSummary={c.aiSummary}
              priorConsultCount={c.priorConsults.length}
              onInsertTemplate={(body) => {
                setNotes(body);
                setDirty(true);
              }}
            />
          </div>

          {/* drafted artefacts, held until close */}
          <div className="rounded-lg border border-line">
            <div className="border-b border-line px-3 py-2 text-xs font-semibold tracking-wide uppercase text-muted">
              Pending release ({artefactCount})
            </div>
            <div className="divide-y divide-line text-[13px]">
              {artefactCount === 0 && (
                <p className="px-3 py-3 text-muted">Nothing issued yet.</p>
              )}
              {c.prescriptions.map((p) => (
                <div key={p.id} className="px-3 py-2">
                  <div className="font-medium">{p.productName}</div>
                  <div className="text-xs text-muted">
                    {p.quantity} · {p.repeats} rpt · {p.directions}
                  </div>
                  <div className="mt-0.5 text-[11px]">
                    {p.status === "issued" ? (
                      <span className="font-mono text-green-700">{p.escriptToken}</span>
                    ) : (
                      <span className="text-amber-700">draft — releases on close</span>
                    )}
                  </div>
                </div>
              ))}
              {c.referrals.map((r) => (
                <div key={r.id} className="px-3 py-2">
                  <div className="font-medium">Referral — {r.recipient}</div>
                  <div className="text-[11px] text-amber-700">{r.status}</div>
                </div>
              ))}
              {c.investigations.map((i) => (
                <div key={i.id} className="px-3 py-2">
                  <div className="font-medium capitalize">{i.type} — {i.tests}</div>
                  <div className="text-[11px] text-amber-700">{i.status}</div>
                </div>
              ))}
              {c.documents.map((d) => (
                <div key={d.id} className="px-3 py-2">
                  <div className="font-medium">{DOCUMENT_LABELS[d.type]}</div>
                  <div className="text-[11px] text-amber-700">{d.status}</div>
                </div>
              ))}
              {c.billings.map((b) => (
                <div key={b.id} className="px-3 py-2">
                  <div className="font-medium">
                    {b.itemNumber ? `Item ${b.itemNumber}` : "No billing"}
                  </div>
                  <div className="text-xs text-muted">
                    {b.itemNumber ? money(Number(b.fee)) : b.noBillingReason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============ MIDDLE ============ */}
        <div className="flex min-h-0 flex-col">
          {/* action bar */}
          <div className="flex shrink-0 justify-center gap-2 border-b border-line px-4 py-3">
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                onClick={() => setOpenAction(a.key)}
                className="flex w-20 flex-col items-center gap-1 rounded p-1.5 hover:bg-slate-50"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${a.color}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {a.icon}
                  </svg>
                </span>
                <span className="text-[11px] text-muted">{a.label}</span>
              </button>
            ))}
          </div>

          {/* notes toolbar */}
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Template</span>
              <Select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="!w-52 !py-1 text-xs"
              >
                {templates.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </Select>
              <Button
                variant="ghost"
                className="!py-1 text-xs"
                onClick={() => {
                  const t = templates.data?.find((x) => x.id === templateId);
                  if (t) {
                    setNotes(t.body);
                    setDirty(true);
                  }
                }}
              >
                Insert
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="!py-1 text-xs"
                onClick={() => setTranscriptOpen(true)}
              >
                Transcript {c.transcript ? "✓" : ""}
              </Button>
              <Button
                variant="ghost"
                className="!py-1 text-xs font-semibold text-[#2f7fd1]"
                disabled={runScribe.isPending}
                onClick={() => runScribe.mutate({ consultId, templateId: templateId || undefined })}
              >
                {runScribe.isPending ? "Writing…" : "AI Scribe"}
              </Button>
            </div>
          </div>

          {/* notes */}
          <div className="min-h-0 flex-1 p-4">
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
              placeholder="Add patient notes"
              className="h-full !resize-none"
            />
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-2.5">
            <div className="text-xs text-muted">
              {attested ? (
                <span className="text-green-700">
                  ✓ Attested {shortDate(c.notesAttestedAt)}
                </span>
              ) : dirty ? (
                <span className="text-amber-700">Unsaved changes</span>
              ) : (
                <span>Not yet attested</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                disabled={!dirty || saveNotes.isPending}
                onClick={() => saveNotes.mutate({ consultId, body: notes })}
              >
                Save notes
              </Button>
              <Button
                variant="success"
                disabled={dirty || attested || !notes.trim() || attest.isPending}
                onClick={() => attest.mutate({ consultId })}
                title={dirty ? "Save your changes first" : undefined}
              >
                Review &amp; attest
              </Button>
            </div>
          </div>
        </div>

        {/* ============ RIGHT ============ */}
        <div className="flex min-h-0 flex-col border-l border-line">
          <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2.5">
            <span className="text-sm font-semibold">Patient chat</span>
            <div className="flex gap-3">
              <button
                onClick={() => setPickingCall("audio")}
                className="text-[#2f7fd1]"
                title="Call patient"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" />
                </svg>
              </button>
              {/* Always clickable. Whether video is actually available is the
                  server's decision, and the picker renders that answer with the
                  reason attached — re-deriving it here is how the button and
                  the rule drift apart. */}
              <button
                onClick={() => setPickingCall("video")}
                className="text-[#2f7fd1]"
                title="Start video"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4Z" />
                </svg>
              </button>
            </div>
          </div>

          {activeCall && (
            <CallDock
              consultId={consultId}
              call={activeCall}
              onEnded={() => setActiveCall(null)}
            />
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="mb-3 text-center text-xs text-muted">
              {c.startedAt ? "Your consult has started" : "Consult not started"}
            </p>

            <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 p-3">
              <div className="text-[11px] text-muted">Date of birth</div>
              <div className="mb-2 text-sm">{shortDate(c.patient.dob)}</div>
              <div className="text-[11px] text-muted">Condition description</div>
              <div className="text-sm">{c.additionalInfo}</div>
            </div>

            <button
              onClick={() => nudge.mutate({ consultId })}
              className="mb-2 flex w-full items-center justify-center gap-1.5 rounded border border-red-200 bg-white py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Nudge Patient
            </button>

            {!c.patientJoinedAt && (
              <button
                onClick={() => patientJoin.mutate({ consultId })}
                className="w-full rounded border border-dashed border-line py-1.5 text-xs text-muted hover:bg-slate-50"
              >
                Simulate patient tapping the SMS link
              </button>
            )}
            {c.patientJoinedAt && (
              <p className="rounded bg-green-50 py-1.5 text-center text-xs text-green-700">
                Patient joined — video available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- modals ---------------- */}
      <CallProviderModal
        consultId={consultId}
        mode={pickingCall ?? "audio"}
        open={pickingCall !== null}
        onClose={() => setPickingCall(null)}
        onStarted={setActiveCall}
      />

      <PrescribeModal consultId={consultId} open={openAction === "prescribe"} onClose={() => setOpenAction(null)} />
      <ReferModal consultId={consultId} open={openAction === "refer"} onClose={() => setOpenAction(null)} />
      <InvestigateModal consultId={consultId} open={openAction === "investigate"} onClose={() => setOpenAction(null)} />
      <DocumentModal consultId={consultId} open={openAction === "document"} onClose={() => setOpenAction(null)} />
      <BillModal consultId={consultId} open={openAction === "bill"} onClose={() => setOpenAction(null)} />

      <AddFamilyModal
        consultId={consultId}
        open={familyOpen}
        onClose={() => setFamilyOpen(false)}
        onOpenConsult={(id) => navigate(`/consult/${id}`)}
      />

      {/* transcript */}
      <Modal
        open={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        title="Consult recording"
        width="max-w-2xl"
      >
        <Alert tone="warn" title="Consent is required">
          The scribe will not run without recorded patient consent to being
          recorded. This is a legal requirement, not a preference.
        </Alert>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent || Boolean(c.transcript?.consentGiven)}
            onChange={(e) => setConsent(e.target.checked)}
            className="h-4 w-4 accent-[#2f7fd1]"
          />
          Patient consented to this consultation being recorded
        </label>
        <Field label="Transcript" hint="Stands in for live speech-to-text.">
          <Textarea
            rows={12}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setTranscriptOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!consent && !c.transcript?.consentGiven}
            onClick={() => {
              captureTranscript.mutate({
                consultId,
                body: transcript,
                consentGiven: true,
              });
              setTranscriptOpen(false);
            }}
          >
            Capture transcript
          </Button>
        </div>
      </Modal>

      {/* end consult */}
      <Modal
        open={endOpen}
        onClose={() => {
          setEndOpen(false);
          if (endResult) navigate("/");
        }}
        title={endResult ? "Consult closed" : "End consult"}
        width="max-w-xl"
      >
        {endResult ? (
          <>
            <Alert tone="success" title="Artefacts released">
              Everything below was delivered to the patient in a single
              transaction and the claim has been queued.
            </Alert>
            <ul className="mb-4 ml-4 list-disc text-sm">
              {endResult.links.map((l, i) => (
                <li key={i} className="font-mono text-[12.5px]">{l}</li>
              ))}
              {endResult.links.length === 0 && (
                <li className="list-none text-muted">No artefacts to release.</li>
              )}
            </ul>
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => navigate("/")}>
                Back to queue
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted">
              Ending the consult commits the record, releases every drafted
              artefact to the patient at once, and queues the Medicare claim.
            </p>
            <ul className="mb-4 space-y-1.5 text-sm">
              <Gate ok={Boolean(notes.trim())} label="Clinical notes recorded" />
              <Gate ok={!dirty} label="Notes saved" />
              <Gate ok={attested} label="Notes reviewed and attested" />
              <Gate ok={hasBilling} label="Billing decision recorded" />
            </ul>
            <p className="mb-4 text-sm">
              <strong>{artefactCount}</strong> artefact
              {artefactCount === 1 ? "" : "s"} will be released.
            </p>
            {error && <Alert tone="danger">{error}</Alert>}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEndOpen(false)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={!canEnd || end.isPending}
                onClick={() => end.mutate({ consultId })}
              >
                End consult
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={Boolean(error) && !endOpen} onClose={() => setError(null)} title="Cannot proceed" width="max-w-md">
        <Alert tone="danger">{error}</Alert>
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setError(null)}>OK</Button>
        </div>
      </Modal>
    </div>
  );
}

function Gate({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={ok ? "text-green-600" : "text-slate-300"}>
        {ok ? "✓" : "○"}
      </span>
      <span className={ok ? "" : "text-muted"}>{label}</span>
    </li>
  );
}
