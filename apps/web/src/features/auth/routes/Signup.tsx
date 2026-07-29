import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { Alert, Button, Field, Input, Select } from "@/shared/ui/index.tsx";
import { DOCTOR_TYPE_LABELS } from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";
import { AuthLayout } from "../components/AuthLayout.tsx";

type DoctorType = "gp_fellow" | "vr" | "non_vr" | "registrar";

/** Same wording the server uses, so the checklist never disagrees with it. */
const PROBLEM_LABELS: Record<string, string> = {
  too_short: "At least 12 characters",
  needs_lowercase: "A lowercase letter",
  needs_uppercase: "An uppercase letter",
  needs_digit: "A number",
  too_common: "Not an easily guessed password",
  contains_email: "Does not contain your email",
};

const ALL_RULES = Object.keys(PROBLEM_LABELS);

export function Signup() {
  const trpc = useTRPC();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    providerNumber: "",
    prescriberNumber: "",
    doctorType: "gp_fellow" as DoctorType,
    qualifications: "",
    mobile: "",
  });
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Strength is evaluated server-side by the same policy that enforces it.
  const feedback = useQuery({
    ...trpc.auth.passwordFeedback.queryOptions({
      password: form.password,
      email: form.email || undefined,
    }),
    enabled: form.password.length > 0,
  });

  const problems = feedback.data ?? [];
  const passwordOk = form.password.length > 0 && problems.length === 0;

  const signup = useMutation(
    trpc.auth.signup.mutationOptions({ onError: (e) => setError(e.message) }),
  );

  if (signup.isSuccess) {
    return (
      <AuthLayout
        title="Check your email"
        footer={
          <Link to="/login" className="text-brand-dark hover:underline">
            Back to sign in
          </Link>
        }
      >
        <Alert tone="success" title="Verification sent">
          If that address can be registered, a verification link is on its way.
          The link is single use and expires in 24 hours.
        </Alert>
        <p className="text-sm text-muted">
          You will not be able to sign in until the address is verified — an
          account that can prescribe should not be reachable on an unproven
          email.
        </p>
        <p className="mt-3 rounded border border-line bg-slate-50 px-3 py-2 text-xs text-muted">
          <strong>Prototype:</strong> no mail server is configured. The link is
          printed to the API console, and also available at{" "}
          <code className="text-[11px]">/verify</code> via the dev mailbox.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Register as a clinician"
      subtitle="Your provider number is verified before your account can prescribe."
      footer={
        <span className="text-muted">
          Already registered?{" "}
          <Link to="/login" className="text-brand-dark hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      {error && <Alert tone="danger">{error}</Alert>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          signup.mutate({
            ...form,
            qualifications: form.qualifications || undefined,
            mobile: form.mobile || undefined,
          });
        }}
      >
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="First name">
            <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required autoFocus />
          </Field>
          <Field label="Last name">
            <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
          </Field>
        </div>

        <Field label="Email">
          <Input
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </Field>

        <Field label="Password">
          <Input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
          />
        </Field>

        {form.password.length > 0 && (
          <ul className="mb-3.5 -mt-1 space-y-0.5">
            {ALL_RULES.map((rule) => {
              const failed = problems.includes(rule as never);
              return (
                <li
                  key={rule}
                  className={`flex items-center gap-1.5 text-xs ${
                    failed ? "text-muted" : "text-green-700"
                  }`}
                >
                  <span>{failed ? "○" : "✓"}</span>
                  {PROBLEM_LABELS[rule]}
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Provider number" hint="e.g. 2412341A">
            <Input
              value={form.providerNumber}
              onChange={(e) => set("providerNumber", e.target.value.toUpperCase())}
              required
            />
          </Field>
          <Field label="Prescriber number">
            <Input
              value={form.prescriberNumber}
              onChange={(e) => set("prescriberNumber", e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Registration type">
          <Select
            value={form.doctorType}
            onChange={(e) => set("doctorType", e.target.value as DoctorType)}
          >
            {Object.entries(DOCTOR_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Qualifications">
            <Input
              value={form.qualifications}
              onChange={(e) => set("qualifications", e.target.value)}
              placeholder="MBBS, FRACGP"
            />
          </Field>
          <Field label="Mobile">
            <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
          </Field>
        </div>

        <Button type="submit" variant="primary" full disabled={signup.isPending || !passwordOk}>
          {signup.isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <Alert tone="warn" title="Not implemented">
        <span className="text-xs">
          Provider numbers are format-checked only. A production build must
          verify the Medicare check digit, confirm AHPRA registration, and
          require multi-factor authentication before the account can prescribe.
        </span>
      </Alert>
    </AuthLayout>
  );
}
