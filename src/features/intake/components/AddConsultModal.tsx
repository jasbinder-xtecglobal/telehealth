/**
 * Creates a booking from the workstation.
 *
 * Stands in for the public website while that lives in its own repository —
 * same endpoint, same validation, same rules; only the door is different. When
 * the website returns this stays useful for testing.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  dob: "",
  gender: "",
  phone: "",
  email: "",
  suburb: "",
  postcode: "",
  reason: "general",
  symptoms: "",
  painLevel: "",
  reportedAllergies: "",
  reportedMedications: "",
  preference: "phone" as "phone" | "video",
};

export function AddConsultModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const reasons = useQuery({
    ...trpc.intake.bookingReasons.queryOptions(),
    enabled: open,
    staleTime: Infinity,
  });

  const book = useMutation(
    trpc.intake.bookConsultation.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.queue.list.queryKey() });
        setForm(EMPTY);
        onClose();
      },
    }),
  );

  const set = (k: keyof typeof EMPTY) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () =>
    book.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dob: form.dob,
      gender: form.gender || undefined,
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      suburb: form.suburb.trim() || undefined,
      postcode: form.postcode.trim() || undefined,
      reason: form.reason as never,
      symptoms: form.symptoms.trim(),
      painLevel: form.painLevel ? Number(form.painLevel) : undefined,
      reportedAllergies: form.reportedAllergies.trim() || undefined,
      reportedMedications: form.reportedMedications.trim() || undefined,
      preference: form.preference,
      // The website asks the patient to confirm this is not an emergency. An
      // operator entering the booking is making the same declaration.
      emergencyCleared: true,
    });

  return (
    <Modal open={open} onClose={onClose} title="Add a patient to the queue">
      <p className="mb-4 text-sm text-muted">
        Creates the same booking the public website would. The patient joins the
        live queue and can be claimed immediately.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <Input value={form.firstName} onChange={(e) => set("firstName")(e.target.value)} />
        </Field>
        <Field label="Last name">
          <Input value={form.lastName} onChange={(e) => set("lastName")(e.target.value)} />
        </Field>
        <Field label="Date of birth">
          <Input type="date" value={form.dob} onChange={(e) => set("dob")(e.target.value)} />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onChange={(e) => set("gender")(e.target.value)}>
            <option value="">Not stated</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </Select>
        </Field>
        <Field label="Mobile">
          <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="0400 000 000" />
        </Field>
        <Field label="Email">
          <Input value={form.email} onChange={(e) => set("email")(e.target.value)} />
        </Field>
        <Field label="Suburb">
          <Input value={form.suburb} onChange={(e) => set("suburb")(e.target.value)} />
        </Field>
        <Field label="Postcode">
          <Input value={form.postcode} onChange={(e) => set("postcode")(e.target.value)} />
        </Field>
        <Field label="Reason">
          <Select value={form.reason} onChange={(e) => set("reason")(e.target.value)}>
            {reasons.data?.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Consult type">
          <Select
            value={form.preference}
            onChange={(e) => set("preference")(e.target.value)}
          >
            <option value="phone">Phone</option>
            <option value="video">Video</option>
          </Select>
        </Field>
        <Field label="Pain level (1–10)">
          <Input
            type="number"
            min={1}
            max={10}
            value={form.painLevel}
            onChange={(e) => set("painLevel")(e.target.value)}
          />
        </Field>
        <Field label="Reported allergies">
          <Input
            value={form.reportedAllergies}
            onChange={(e) => set("reportedAllergies")(e.target.value)}
            placeholder="As the patient describes them"
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field
          label="What is happening"
          hint="In the patient's own words — this is what the doctor sees in the queue."
        >
          <Textarea
            rows={3}
            value={form.symptoms}
            onChange={(e) => set("symptoms")(e.target.value)}
          />
        </Field>
      </div>

      {book.error && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {book.error.message}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={book.isPending} onClick={submit}>
          {book.isPending ? "Adding…" : "Add to queue"}
        </Button>
      </div>
    </Modal>
  );
}
