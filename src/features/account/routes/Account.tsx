import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Field,
  Input,
  Modal,
  Spinner,
  Textarea,
} from "@/shared/ui/index.tsx";
import { DOCTOR_TYPE_LABELS, shortDate } from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";

export function Account() {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const me = useQuery(trpc.doctor.me.queryOptions());
  const templates = useQuery(trpc.doctor.templates.queryOptions());
  const hidden = useQuery(trpc.doctor.hiddenPatients.queryOptions());

  const [chosenName, setChosenName] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [scribe, setScribe] = useState("");
  const [telehealth, setTelehealth] = useState(true);
  const [homeVisits, setHomeVisits] = useState(false);
  const [largeFont, setLargeFont] = useState(false);

  const [editing, setEditing] = useState<{ id?: string; name: string; body: string; isDefault: boolean } | null>(null);

  useEffect(() => {
    if (!me.data) return;
    setChosenName(me.data.chosenName ?? "");
    setQualifications(me.data.qualifications ?? "");
    setScribe(me.data.aiScribePersonalisation ?? "");
    setTelehealth(me.data.prefTelehealth);
    setHomeVisits(me.data.prefHomeVisits);
    setLargeFont(me.data.largeFont);
  }, [me.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation(
    trpc.doctor.updateProfile.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.doctor.me.queryKey() }),
    }),
  );
  const saveTemplate = useMutation(
    trpc.doctor.saveTemplate.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.doctor.templates.queryKey() });
        setEditing(null);
      },
    }),
  );
  const deleteTemplate = useMutation(
    trpc.doctor.deleteTemplate.mutationOptions({
      onSuccess: () =>
        qc.invalidateQueries({ queryKey: trpc.doctor.templates.queryKey() }),
    }),
  );
  const unhide = useMutation(
    trpc.doctor.unhidePatient.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.doctor.hiddenPatients.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.queue.list.queryKey() });
      },
    }),
  );

  if (me.isLoading) return <Spinner />;
  const d = me.data!;

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <h1 className="mb-4 text-lg font-semibold">My Account</h1>

      {/* read-only credentials */}
      <div className="mb-5 grid gap-x-8 gap-y-3 rounded-lg border border-line p-4 sm:grid-cols-2 lg:grid-cols-3">
        <RO label="First name" value={d.firstName} />
        <RO label="Last name" value={d.lastName} />
        <RO label="Email" value={d.email} />
        <RO label="Mobile" value={d.mobile ?? "—"} />
        <RO label="Provider number" value={d.providerNumber} />
        <RO label="Prescriber number" value={d.prescriberNumber} />
        <RO label="Doctor type" value={DOCTOR_TYPE_LABELS[d.doctorType] ?? d.doctorType} />
        <RO label="Gender" value={d.gender ?? "—"} />
      </div>

      <Alert tone="warn" title="Credentialing not implemented">
        A production build must hold AHPRA registration and indemnity expiry
        dates here, verify them automatically, and suspend the account when
        either lapses.
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* editable profile */}
        <div>
          <h2 className="mb-2 text-sm font-semibold">Profile</h2>
          <div className="rounded-lg border border-line p-4">
            <Field label="Chosen name" hint="Shown to patients on certificates and scripts.">
              <Input
                value={chosenName}
                onChange={(e) => setChosenName(e.target.value)}
                placeholder="Dr …"
              />
            </Field>
            <Field label="Qualifications">
              <Input
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
              />
            </Field>
            <Field
              label="AI scribe personalisation"
              hint="Appended to the scribe prompt. Steers style, not clinical content."
            >
              <Textarea
                rows={5}
                value={scribe}
                onChange={(e) => setScribe(e.target.value)}
              />
            </Field>

            <div className="mb-3 space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                Work preferences
              </span>
              <Check label="Telehealth" checked={telehealth} onChange={setTelehealth} />
              <Check label="Home visits" checked={homeVisits} onChange={setHomeVisits} />
              <Check label="Make font better" checked={largeFont} onChange={setLargeFont} />
            </div>

            <Button
              variant="primary"
              full
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  chosenName: chosenName || null,
                  qualifications: qualifications || null,
                  aiScribePersonalisation: scribe || null,
                  prefTelehealth: telehealth,
                  prefHomeVisits: homeVisits,
                  largeFont,
                })
              }
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        {/* templates + hidden patients */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Note templates</h2>
            <Button
              onClick={() => setEditing({ name: "", body: "", isDefault: false })}
            >
              New template
            </Button>
          </div>
          <div className="mb-6 divide-y divide-line rounded-lg border border-line">
            {templates.data?.length === 0 && (
              <p className="px-4 py-4 text-sm text-muted">No templates yet.</p>
            )}
            {templates.data?.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <span className="text-sm font-medium">{t.name}</span>
                  {t.isDefault && (
                    <span className="ml-2 text-[10px] font-semibold text-[#2f9e5f] uppercase">
                      default
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    className="!py-1 text-xs"
                    onClick={() =>
                      setEditing({
                        id: t.id,
                        name: t.name,
                        body: t.body,
                        isDefault: t.isDefault,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="!py-1 text-xs text-red-600"
                    onClick={() => deleteTemplate.mutate({ id: t.id })}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <h2 className="mb-2 text-sm font-semibold">Hidden patients</h2>
          <div className="divide-y divide-line rounded-lg border border-line">
            {hidden.data?.length === 0 && (
              <p className="px-4 py-4 text-sm text-muted">No hidden patients.</p>
            )}
            {hidden.data?.map((h) => (
              <div key={h.id} className="flex items-start justify-between px-4 py-2.5">
                <div>
                  <div className="text-sm font-medium">
                    {h.firstName} {h.lastName}
                  </div>
                  <div className="text-xs text-muted">
                    {h.reason} · {shortDate(h.createdAt)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="!py-1 text-xs"
                  onClick={() => unhide.mutate({ patientId: h.patientId })}
                >
                  Unhide
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit template"
        width="max-w-2xl"
      >
        {editing && (
          <>
            <Field label="Name">
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="Template">
              <Textarea
                rows={16}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </Field>
            <label className="mb-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.isDefault}
                onChange={(e) =>
                  setEditing({ ...editing, isDefault: e.target.checked })
                }
                className="h-4 w-4 accent-[#2f7fd1]"
              />
              Is default template
            </label>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!editing.name.trim() || saveTemplate.isPending}
                onClick={() => saveTemplate.mutate(editing)}
              >
                Save template
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function RO({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
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
