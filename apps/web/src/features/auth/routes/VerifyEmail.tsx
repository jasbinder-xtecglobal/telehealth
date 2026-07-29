import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { Alert, Button, Spinner } from "@/shared/ui/index.tsx";
import { useTRPC } from "@/shared/lib/trpc.ts";
import { AuthLayout } from "../components/AuthLayout.tsx";

export function VerifyEmail() {
  const trpc = useTRPC();
  const [params] = useSearchParams();
  const token = params.get("token");
  const attempted = useRef(false);

  const verify = useMutation(trpc.auth.verifyEmail.mutationOptions());

  // Single use — guard against React strict-mode double invocation.
  useEffect(() => {
    if (token && !attempted.current) {
      attempted.current = true;
      verify.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* -------- no token: show the prototype mailbox -------- */
  if (!token) return <DevMailbox />;

  if (verify.isPending) {
    return (
      <AuthLayout title="Verifying your email">
        <Spinner />
      </AuthLayout>
    );
  }

  if (verify.isError) {
    return (
      <AuthLayout
        title="Verification failed"
        footer={
          <Link to="/login" className="text-brand-dark hover:underline">
            Back to sign in
          </Link>
        }
      >
        <Alert tone="danger">{verify.error.message}</Alert>
        <p className="text-sm text-muted">
          Verification links are single use and expire after 24 hours. Request a
          fresh one from the sign-in screen.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Email verified">
      <Alert tone="success" title="Your account is active">
        {verify.data?.email} is confirmed. You can sign in now.
      </Alert>
      <Link to="/login">
        <Button variant="primary" full>
          Continue to sign in
        </Button>
      </Link>
    </AuthLayout>
  );
}

/**
 * Prototype affordance — reads the mock email outbox so a verification link
 * can be followed without a mail server. Not part of a real deployment.
 */
function DevMailbox() {
  const trpc = useTRPC();
  const mailbox = useQuery({
    ...trpc.auth.devMailbox.queryOptions(),
    refetchInterval: 5_000,
  });

  return (
    <AuthLayout
      title="Verification mailbox"
      subtitle="No mail server is configured, so sent emails land here."
      footer={
        <Link to="/login" className="text-brand-dark hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Alert tone="warn" title="Prototype only">
        This screen exposes recipient addresses and must be removed before any
        real deployment.
      </Alert>

      {mailbox.data?.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">Nothing sent yet.</p>
      )}

      <div className="divide-y divide-line">
        {mailbox.data?.map((m, i) => (
          <div key={i} className="py-3">
            <div className="text-xs text-muted">
              To {m.to} · {new Date(m.sentAt).toLocaleTimeString("en-AU")}
            </div>
            <div className="text-sm font-medium">{m.subject}</div>
            {m.link && (
              <a
                href={m.link}
                className="mt-1 inline-block text-xs break-all text-brand-dark hover:underline"
              >
                {m.link}
              </a>
            )}
          </div>
        ))}
      </div>
    </AuthLayout>
  );
}
