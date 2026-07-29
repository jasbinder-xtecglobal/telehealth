import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  DOCUMENT_LABELS,
  DOCUMENT_TYPES,
  money,
  type DocumentTypeKey,
} from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";
import { Alert, Button, Field, Input, Modal, Select, Textarea } from "@/shared/ui/index.tsx";

type Props = { consultId: string; open: boolean; onClose: () => void };

function useRefresh(consultId: string) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      queryKey: trpc.consult.get.queryKey({ consultId }),
    });
}

/* ================================================================== *
 * Prescribe
 * ================================================================== */
export function PrescribeModal({ consultId, open, onClose }: Props) {
  const trpc = useTRPC();
  const refresh = useRefresh(consultId);

  const [term, setTerm] = useState("");
  const [drugId, setDrugId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(20);
  const [repeats, setRepeats] = useState(0);
  const [directions, setDirections] = useState("");
  const [type, setType] = useState<"pbs" | "streamlined_authority" | "private">("pbs");
  const [override, setOverride] = useState("");

  const drugs = useQuery(
    trpc.reference.searchDrugs.queryOptions({ term, allDrugs: true }),
  );

  const check = useQuery({
    ...trpc.consult.checkPrescription.queryOptions({
      consultId,
      drugId: drugId ?? "",
    }),
    enabled: Boolean(drugId),
  });

  const prescribe = useMutation(
    trpc.consult.prescribe.mutationOptions({
      onSuccess: () => {
        refresh();
        reset();
        onClose();
      },
    }),
  );

  function reset() {
    setDrugId(null);
    setTerm("");
    setDirections("");
    setRepeats(0);
    setOverride("");
    setType("pbs");
  }

  const drug = check.data?.drug;
  const blocking = check.data?.blocking ?? [];
  const warnings = check.data?.warnings ?? [];
  const canSubmit =
    Boolean(drugId) &&
    directions.trim().length > 0 &&
    (blocking.length === 0 || override.trim().length >= 5);

  return (
    <Modal open={open} onClose={onClose} title="Prescribe" width="max-w-3xl">
      <Field label="Search by active ingredient or product name">
        <Input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setDrugId(null);
          }}
          placeholder="e.g. amoxicillin, Keflex, molnupiravir"
          autoFocus
        />
      </Field>

      {!drugId && (
        <div className="mb-4 max-h-56 overflow-y-auto rounded border border-line">
          {drugs.data?.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted">No matches.</p>
          )}
          {drugs.data?.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setDrugId(d.id);
                setQuantity(d.defaultPackSize);
                setDirections(d.suggestedDose ?? "");
                setType(d.isStreamlined ? "streamlined_authority" : "pbs");
              }}
              className="flex w-full items-center justify-between border-b border-line px-3 py-2 text-left last:border-0 hover:bg-slate-50"
            >
              <span>
                <span className="text-sm font-medium">{d.productName}</span>
                <span className="ml-2 text-xs text-muted">
                  {d.activeIngredient} {d.strength} {d.form}
                </span>
              </span>
              <span className="flex gap-1.5">
                {d.isStreamlined && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    Streamlined
                  </span>
                )}
                {d.isMonitored && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                    Monitored
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {drug && (
        <>
          <div className="mb-3 flex items-center justify-between rounded border border-line bg-slate-50 px-3 py-2">
            <div>
              <div className="text-sm font-semibold">{drug.productName}</div>
              <div className="text-xs text-muted">
                {drug.activeIngredient} {drug.strength} Â· {drug.form}
                {drug.pbsCode ? ` Â· PBS ${drug.pbsCode}` : ""}
              </div>
            </div>
            <Button variant="ghost" onClick={() => setDrugId(null)}>
              Change
            </Button>
          </div>

          {/* Safety checks — absent from the reference software */}
          {blocking.map((b, i) => (
            <Alert key={i} tone="danger" title="Contraindication">
              {b}
            </Alert>
          ))}
          {warnings.map((w, i) => (
            <Alert key={i} tone="warn" title="Alert">
              {w}
            </Alert>
          ))}

          {drug.isStreamlined && drug.restrictionCriteria && (
            <Alert tone="info" title={`PBS restriction — streamline ${drug.streamlineCode}`}>
              {drug.restrictionCriteria}
            </Alert>
          )}

          <div className="grid gap-x-4 sm:grid-cols-3">
            <Field label="Quantity">
              <Input
                type="number"
                value={quantity}
                min={1}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </Field>
            <Field label="Repeats">
              <Input
                type="number"
                value={repeats}
                min={0}
                max={5}
                onChange={(e) => setRepeats(Number(e.target.value))}
              />
            </Field>
            <Field label="Type">
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
              >
                <option value="pbs">PBS</option>
                <option
                  value="streamlined_authority"
                  disabled={!drug.isStreamlined}
                >
                  Streamlined authority
                </option>
                <option value="private">Private</option>
              </Select>
            </Field>
          </div>

          <Field label="Directions">
            <Input
              value={directions}
              onChange={(e) => setDirections(e.target.value)}
              placeholder="e.g. 500 mg three times daily for 5 days"
            />
          </Field>

          {blocking.length > 0 && (
            <Field
              label="Override reason (required)"
              hint="Proceeding past a contraindication is recorded against your provider number."
            >
              <Textarea
                rows={2}
                value={override}
                onChange={(e) => setOverride(e.target.value)}
              />
            </Field>
          )}

          <Alert tone="info">
            The eScript token is generated and sent to the patient only when the
            consult is ended.
          </Alert>
        </>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant={blocking.length > 0 ? "danger" : "primary"}
          disabled={!canSubmit || prescribe.isPending}
          onClick={() =>
            prescribe.mutate({
              consultId,
              drugId: drugId!,
              quantity,
              repeats,
              directions,
              type,
              streamlineCode: drug?.streamlineCode ?? null,
              overrideReason: override.trim() || null,
            })
          }
        >
          {blocking.length > 0 ? "Override and prescribe" : "Prescribe"}
        </Button>
      </div>
    </Modal>
  );
}

/* ================================================================== *
 * Refer
 * ================================================================== */
export function ReferModal({ consultId, open, onClose }: Props) {
  const trpc = useTRPC();
  const refresh = useRefresh(consultId);
  const [type, setType] = useState<"specialist" | "hospital">("hospital");
  const [recipient, setRecipient] = useState("");
  const [body, setBody] = useState("");

  const refer = useMutation(
    trpc.consult.refer.mutationOptions({
      onSuccess: () => {
        refresh();
        setRecipient("");
        setBody("");
        onClose();
      },
    }),
  );

  return (
    <Modal open={open} onClose={onClose} title="Refer" width="max-w-2xl">
      <Field label="Referral type">
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="hospital">Hospital / emergency department</option>
          <option value="specialist">Specialist</option>
        </Select>
      </Field>
      <Field label={type === "hospital" ? "Hospital name" : "Specialist name"}>
        <Input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder={type === "hospital" ? "e.g. The Alfred" : "e.g. Dr A Patel, Cardiology"}
        />
      </Field>
      <Field label="Referral letter">
        <Textarea
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Clinical background, findings, and reason for referral…"
        />
      </Field>
      <Alert tone="warn" title="Handover gap">
        The prototype delivers this to the patient as a document. A production
        build should also transmit it to the receiving provider by secure
        messaging — patient-carries-the-letter is not a clinical handover.
      </Alert>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!recipient.trim() || !body.trim() || refer.isPending}
          onClick={() => refer.mutate({ consultId, type, recipient, body })}
        >
          Create referral
        </Button>
      </div>
    </Modal>
  );
}

/* ================================================================== *
 * Investigate
 * ================================================================== */
export function InvestigateModal({ consultId, open, onClose }: Props) {
  const trpc = useTRPC();
  const refresh = useRefresh(consultId);
  const [type, setType] = useState<"pathology" | "radiology">("pathology");
  const [tests, setTests] = useState("");
  const [notes, setNotes] = useState("");
  const [copyToGp, setCopyToGp] = useState(false);

  const order = useMutation(
    trpc.consult.investigate.mutationOptions({
      onSuccess: () => {
        refresh();
        setTests("");
        setNotes("");
        onClose();
      },
    }),
  );

  return (
    <Modal open={open} onClose={onClose} title="Investigate" width="max-w-2xl">
      <Field label="Request type">
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="pathology">Pathology</option>
          <option value="radiology">Radiology</option>
        </Select>
      </Field>
      <Field label="Tests requested">
        <Input
          value={tests}
          onChange={(e) => setTests(e.target.value)}
          placeholder={type === "pathology" ? "e.g. FBE, UEC, CRP, MSU M/C/S" : "e.g. Chest X-ray"}
        />
      </Field>
      <Field label="Clinical notes">
        <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={copyToGp}
          onChange={(e) => setCopyToGp(e.target.checked)}
          className="h-4 w-4 accent-[#2f7fd1]"
        />
        Copy results to the patient's usual GP
      </label>
      <Alert tone="danger" title="Follow-up is yours">
        Copying the GP does not transfer responsibility. This request will appear
        in your Inbox and must be acknowledged. Unacknowledged results escalate
        to clinical governance.
      </Alert>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!tests.trim() || order.isPending}
          onClick={() =>
            order.mutate({ consultId, type, tests, clinicalNotes: notes, copyToGp })
          }
        >
          Order investigation
        </Button>
      </div>
    </Modal>
  );
}

/* ================================================================== *
 * Document
 * ================================================================== */
export function DocumentModal({ consultId, open, onClose }: Props) {
  const trpc = useTRPC();
  const refresh = useRefresh(consultId);
  const today = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState<DocumentTypeKey>("med_cert_work");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [body, setBody] = useState("");

  const issue = useMutation(
    trpc.consult.issueDocument.mutationOptions({
      onSuccess: () => {
        refresh();
        setBody("");
        onClose();
      },
    }),
  );

  const isCert = type !== "blank";

  return (
    <Modal open={open} onClose={onClose} title="Document" width="max-w-2xl">
      <Field label="Document type">
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          {DOCUMENT_TYPES.map((k) => (
            <option key={k} value={k}>
              {DOCUMENT_LABELS[k]}
            </option>
          ))}
        </Select>
      </Field>

      {isCert && (
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="From">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </div>
      )}

      <Field
        label={isCert ? "Additional wording (optional)" : "Instructions for the patient"}
      >
        <Textarea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            isCert
              ? "Leave blank for the standard wording"
              : "e.g. Paracetamol 1 g four times daily. Ibuprofen 400 mg three times daily with food."
          }
        />
      </Field>

      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={issue.isPending || (!isCert && !body.trim())}
          onClick={() =>
            issue.mutate({
              consultId,
              type,
              startDate: isCert ? startDate : null,
              endDate: isCert ? endDate : null,
              body,
            })
          }
        >
          Create document
        </Button>
      </div>
    </Modal>
  );
}

/* ================================================================== *
 * Bill
 * ================================================================== */
export function BillModal({ consultId, open, onClose }: Props) {
  const trpc = useTRPC();
  const refresh = useRefresh(consultId);
  const [itemNumber, setItemNumber] = useState<string | null>(null);
  const [noBilling, setNoBilling] = useState(false);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const items = useQuery(
    trpc.reference.mbsItems.queryOptions({ channel: "telehealth" }),
  );

  const setBilling = useMutation(
    trpc.consult.setBilling.mutationOptions({
      onSuccess: (res) => {
        refresh();
        setErrors(res.errors);
        if (res.errors.length === 0) onClose();
      },
    }),
  );

  return (
    <Modal open={open} onClose={onClose} title="Bill" width="max-w-2xl">
      {errors.length > 0 && (
        <Alert tone="warn" title="Item recorded with warnings">
          <ul className="ml-4 list-disc">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}

      <label className="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={noBilling}
          onChange={(e) => {
            setNoBilling(e.target.checked);
            setItemNumber(null);
          }}
          className="h-4 w-4 accent-[#2f7fd1]"
        />
        No billing for this consult
      </label>

      {noBilling ? (
        <Field
          label="Reason"
          hint="A consult closed with no item and no reason is unpaid clinical work."
        >
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. patient not eligible, advice only, duplicate booking"
          />
        </Field>
      ) : (
        <div className="mb-3 max-h-72 overflow-y-auto rounded border border-line">
          {items.data?.map((i) => (
            <button
              key={i.id}
              onClick={() => setItemNumber(i.itemNumber)}
              className={`flex w-full items-center justify-between border-b border-line px-3 py-2.5 text-left last:border-0 hover:bg-slate-50 ${
                itemNumber === i.itemNumber ? "bg-blue-50" : ""
              }`}
            >
              <span>
                <span className="font-mono text-sm font-semibold">
                  {i.itemNumber}
                </span>
                <span className="ml-3 text-sm">{i.description}</span>
                {(i.minMinutes !== null || i.maxMinutes !== null) && (
                  <span className="ml-2 text-xs text-muted">
                    ({i.minMinutes ?? 0}
                    {i.maxMinutes ? `–${i.maxMinutes}` : "+"} min)
                  </span>
                )}
              </span>
              <span className="font-semibold text-[#2f9e5f]">
                {money(Number(i.fee))}
              </span>
            </button>
          ))}
          {items.data?.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted">
              No items available for your registration type on this channel.
            </p>
          )}
        </div>
      )}

      <Alert tone="info">
        Items are filtered to your registration type and validated against the
        consult duration when recorded.
      </Alert>

      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={
            setBilling.isPending ||
            (noBilling ? reason.trim().length < 3 : !itemNumber)
          }
          onClick={() =>
            setBilling.mutate({
              consultId,
              itemNumber: noBilling ? null : itemNumber,
              noBillingReason: noBilling ? reason.trim() : null,
            })
          }
        >
          Record billing
        </Button>
      </div>
    </Modal>
  );
}
