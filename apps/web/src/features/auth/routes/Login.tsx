import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Alert, Button, Field, Input } from "@/shared/ui/index.tsx";
import { useTRPC } from "@/shared/lib/trpc.ts";
import { AuthLayout } from "../components/AuthLayout.tsx";

export function Login() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);

  const login = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: async () => {
        // Session cookie is set; refetch everything as the signed-in doctor.
        await qc.invalidateQueries();
        navigate("/", { replace: true });
      },
      onError: (e) => {
        setError(e.message);
        setUnverified(/verify your email/i.test(e.message));
      },
    }),
  );

  const resend = useMutation(
    trpc.auth.resendVerification.mutationOptions({
      onSuccess: () => {
        setError(null);
        setUnverified(false);
      },
    }),
  );

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use the account issued to you by practice administration."
      footer={
        <span className="text-muted">
          No account yet?{" "}
          <Link to="/signup" className="text-brand-dark hover:underline">
            Register as a clinician
          </Link>
        </span>
      }
    >
      {error && (
        <Alert tone={unverified ? "warn" : "danger"}>
          {error}
          {unverified && (
            <div className="mt-2">
              <Button
                className="!py-1 text-xs"
                disabled={resend.isPending}
                onClick={() => resend.mutate({ email })}
              >
                {resend.isPending ? "Sending…" : "Resend verification email"}
              </Button>
            </div>
          )}
        </Alert>
      )}

      {resend.isSuccess && (
        <Alert tone="success">
          If that address needs verifying, a new link is on its way.
        </Alert>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          login.mutate({ email, password });
        }}
      >
        <Field label="Email">
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </Field>

        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          className="auth-cta"
          full
          disabled={login.isPending || !email || !password}
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
        Accounts lock for 15 minutes after 5 failed attempts. Every sign-in
        attempt is audited.
      </p>
    </AuthLayout>
  );
}
