import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Alert,
  Button,
  Chip,
  Field,
  Modal,
  Spinner,
  Textarea,
} from "@/shared/ui/index.tsx";
import {
  ACUITY_META,
  CATEGORY_LABELS,
  shortDate,
  clockTime,
  waitLabel,
} from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";

export function PatientDetail() {
  const { consultId = "" } = useParams();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [hideOpen, setHideOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [conflict, setConflict] = useState<string | null>(null);

  const consult = useQuery(trpc.consult.get.queryOptions({ consultId }));

  const claim = useMutation(
    trpc.consult.claim.mutationOptions({
      onSuccess: (res) => navigate(`/consult/${res.consult.id}`),
      onError: (e) => setConflict(e.message),
    }),
  );

  const hide = useMutation(
    trpc.consult.hidePatient.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.queue.list.queryKey() });
        navigate("/");
      },
    }),
  );

  const reject = useMutation(
    trpc.consult.reject.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.queue.list.queryKey() });
        navigate("/");
      },
    }),
  );

  if (consult.isLoading) return <Spinner />;
  const c = consult.data;
  if (!c) return <Alert tone="danger">Consult not found.</Alert>;

  const acuity = ACUITY_META[c.acuity] ?? ACUITY_META[4]!;
  const age =
    new Date().getFullYear() - new Date(c.patient.dob).getFullYear();

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <button
        onClick={() => navigate("/")}
        className="mb-4 flex items-center gap-1 text-sm text-[#2f7fd1] hover:underline"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to all patients
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ---------------- detail card ---------------- */}
        <div>
          <div className="rounded-lg border border-line">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-semibold">
                {c.patient.firstName} {c.patient.lastName}, {age},{" "}
                {c.patient.gender}
                {c.patient.state ? `, ${c.patient.state}` : ""}
              </h2>
              <Chip className="border-slate-200 bg-slate-100 text-slate-600">
                {c.channel.replace(/_/g, " ")}
              </Chip>
            </div>

            <dl className="divide-y divide-line text-sm">
              <Row label="Date of birth">{shortDate(c.patient.dob)}</Row>
              <Row label="Consult preference">
                {c.preference === "video" ? "Video call" : "Phone call"}
              </Row>
              <Row label="Request time">
                {clockTime(c.requestedAt)} ({waitLabel(c.requestedAt)})
              </Row>
              <Row label="Symptom or condition">
                {CATEGORY_LABELS[c.symptomCategory] ?? c.symptomCategory}
              </Row>
              <Row label="Additional information">{c.additionalInfo}</Row>
              <Row label="Triage acuity">
                <Chip className={acuity.className}>{acuity.label}</Chip>
              </Row>
              <Row label="Allergies">
                {c.allergies.length === 0
                  ? "Not recorded"
                  : c.allergies
                      .map((a) =>
                        a.isNkda
                          ? "NKDA"
                          : `${a.substance}${a.reaction ? ` (${a.reaction})` : ""}`,
                      )
                      .join(", ")}
              </Row>
              <Row label="Concession card">
                {c.patient.concessionCard ? "Yes" : "No"}
              </Row>
            </dl>
          </div>

          <div className="mt-4 space-y-2">
            <Button
              variant="primary"
              full
              disabled={claim.isPending}
              onClick={() => claim.mutate({ consultId })}
            >
              Start Consult
            </Button>
            <Button variant="outline" full onClick={() => setHideOpen(true)}>
              Hide Patient
            </Button>
            <Button variant="danger" full onClick={() => setRejectOpen(true)}>
              Reject Consult
            </Button>
          </div>
        </div>

        {/* ---------------- AI summary ---------------- */}
        <div>
          {c.intake && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60">
              <div className="border-b border-amber-200 px-4 py-2.5">
                <h2 className="text-sm font-semibold text-amber-900">
                  Reported by the patient at booking
                </h2>
                <p className="text-[11px] text-amber-800">
                  Typed on the website by the patient. Not verified, not coded,
                  and not used by interaction checking — confirm each item
                  before you prescribe.
                </p>
              </div>
              <dl className="divide-y divide-amber-200 text-sm">
                <Row label="Reason given">{c.intake.reasonLabel}</Row>
                {c.intake.painLevel !== null && (
                  <Row label="Pain level">{c.intake.painLevel} / 10</Row>
                )}
                {c.intake.symptomsStartedOn && (
                  <Row label="Symptoms started">
                    {shortDate(c.intake.symptomsStartedOn)}
                  </Row>
                )}
                <Row label="Allergies reported">
                  {c.intake.reportedAllergies || "None reported"}
                </Row>
                <Row label="Medications reported">
                  {c.intake.reportedMedications || "None reported"}
                </Row>
                <Row label="Conditions reported">
                  {c.intake.reportedConditions || "None reported"}
                </Row>
                <Row label="Preferences">
                  {[c.intake.preferredDoctor, c.intake.preferredTime]
                    .filter(Boolean)
                    .join(" · ") || "None"}
                </Row>
                <Row label="Preferred contact">
                  {c.intake.preferredContact}
                  {c.intake.email ? ` · ${c.intake.email}` : ""}
                </Row>
              </dl>
            </div>
          )}

          <div className="rounded-lg border border-line">
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-semibold">
                AI Patient Summary{" "}
                <span className="text-[10px] font-normal text-orange-600">
                  (beta)
                </span>
              </h2>
            </div>
            <pre className="max-h-[420px] overflow-auto px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap">
              {c.aiSummary}
            </pre>
          </div>

          {c.priorConsults.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Generated from {c.priorConsults.length} previous consult
              {c.priorConsults.length === 1 ? "" : "s"}. Always confirm against
              the source notes.
            </p>
          )}
        </div>
      </div>

      {/* ---------------- hide ---------------- */}
      <Modal
        open={hideOpen}
        onClose={() => setHideOpen(false)}
        title="Hide this patient"
        width="max-w-lg"
      >
        <Alert tone="warn" title="This is recorded">
          Hiding removes this patient from your queue permanently. The reason is
          auditable and reversible from My Account.
        </Alert>
        <Field label="Reason">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. previous therapeutic relationship breakdown"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setHideOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 3 || hide.isPending}
            onClick={() =>
              hide.mutate({ patientId: c.patientId, reason: reason.trim() })
            }
          >
            Hide patient
          </Button>
        </div>
      </Modal>

      {/* ---------------- reject ---------------- */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject this consult"
        width="max-w-lg"
      >
        <p className="mb-3 text-sm text-muted">
          The patient returns to the queue for another doctor. Your decline rate
          is visible to clinical governance.
        </p>
        <Field label="Reason">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. outside my scope of practice"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 3 || reject.isPending}
            onClick={() => reject.mutate({ consultId, reason: reason.trim() })}
          >
            Reject consult
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(conflict)}
        onClose={() => navigate("/")}
        title="Patient already claimed"
        width="max-w-md"
      >
        <Alert tone="warn">{conflict}</Alert>
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => navigate("/")}>
            Back to queue
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
