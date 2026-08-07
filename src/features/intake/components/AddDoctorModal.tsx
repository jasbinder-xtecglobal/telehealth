/**
 * Records a doctor's application from the workstation.
 *
 * The same caveat as the applicant-facing form it replaces: this creates an
 * *application*, never an account. An applicant has not been credentialed, has
 * no provider number on file and must never hold a session — the operator
 * creates the account after recruitment and contracting.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/shared/ui/index.tsx";
import { useTRPC } from "@/shared/lib/trpc.ts";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  ahpraNumber: "",
  yearsExperience: "",
  specialty: "",
  employment: "part_time" as "part_time" | "full_time",
  coverLetter: "",
};

export function AddDoctorModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const apply = useMutation(
    trpc.intake.applyAsDoctor.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.intake.applications.queryKey() });
        setForm(EMPTY);
        onClose();
      },
    }),
  );

  const set = (k: keyof typeof EMPTY) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () =>
    apply.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      ahpraNumber: form.ahpraNumber.trim(),
      yearsExperience: form.yearsExperience.trim(),
      specialty: form.specialty.trim(),
      employment: form.employment,
      coverLetter: form.coverLetter.trim() || undefined,
    });

  return (
    <Modal open={open} onClose={onClose} title="Add a doctor application">
      <p className="mb-4 text-sm text-muted">
        Creates an application for review. It does not create an account — that
        is issued after recruitment and contracting.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <Input value={form.firstName} onChange={(e) => set("firstName")(e.target.value)} />
        </Field>
        <Field label="Last name">
          <Input value={form.lastName} onChange={(e) => set("lastName")(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input value={form.email} onChange={(e) => set("email")(e.target.value)} />
        </Field>
        <Field label="Mobile">
          <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
        </Field>
        <Field label="AHPRA number" hint="Checked against the register by hand.">
          <Input value={form.ahpraNumber} onChange={(e) => set("ahpraNumber")(e.target.value)} />
        </Field>
        <Field label="Years of experience">
          <Input
            value={form.yearsExperience}
            onChange={(e) => set("yearsExperience")(e.target.value)}
            placeholder="e.g. 8"
          />
        </Field>
        <Field label="Specialty">
          <Input
            value={form.specialty}
            onChange={(e) => set("specialty")(e.target.value)}
            placeholder="e.g. General Practice"
          />
        </Field>
        <Field label="Employment">
          <Select
            value={form.employment}
            onChange={(e) => set("employment")(e.target.value)}
          >
            <option value="part_time">Part time</option>
            <option value="full_time">Full time</option>
          </Select>
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Cover note">
          <Textarea
            rows={3}
            value={form.coverLetter}
            onChange={(e) => set("coverLetter")(e.target.value)}
          />
        </Field>
      </div>

      {apply.error && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {apply.error.message}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={apply.isPending} onClick={submit}>
          {apply.isPending ? "Adding…" : "Add application"}
        </Button>
      </div>
    </Modal>
  );
}
