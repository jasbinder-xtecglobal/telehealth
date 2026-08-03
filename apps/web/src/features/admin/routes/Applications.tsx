import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Button, Chip, Empty, Spinner } from "@/shared/ui/index.tsx";
import { shortDate } from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";

const STATUS_STYLE: Record<string, string> = {
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  reviewing: "border-amber-200 bg-amber-50 text-amber-800",
  accepted: "border-green-200 bg-green-50 text-green-700",
  declined: "border-slate-200 bg-slate-100 text-slate-600",
};

const EMPLOYMENT_LABEL: Record<string, string> = {
  part_time: "Part-time",
  full_time: "Full-time",
};

/**
 * Doctor applications from the public site.
 *
 * This belongs in an admin console with its own roles, not in the clinician
 * console — any signed-in doctor can read every applicant's contact details
 * here, which is wrong. It is placed here so the recruitment path is
 * demonstrable end to end, and the gap is stated on the page itself.
 */
export function Applications() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const applications = useQuery(trpc.intake.applications.queryOptions());

  const review = useMutation(
    trpc.intake.reviewApplication.mutationOptions({
      onSuccess: () =>
        qc.invalidateQueries({ queryKey: trpc.intake.applications.queryKey() }),
    }),
  );

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <h1 className="text-lg font-semibold">Doctor Applications</h1>
      <p className="mt-1 mb-4 text-sm text-muted">
        Expressions of interest submitted from the public website.
      </p>

      <Alert tone="warn" title="This screen is in the wrong place">
        Applicant contact details are visible to every signed-in doctor. A
        production build needs an admin console with role separation, and an
        applicant's record should not be readable from a clinical workstation.
      </Alert>

      <Alert tone="info" title="Accepting an application does not create a login">
        Nothing on this screen issues credentials. AHPRA registration and
        indemnity cover are verified manually, a contract is signed, and only
        then does an operator create the account.
      </Alert>

      {applications.isLoading && <Spinner />}
      {applications.data?.length === 0 && (
        <Empty>No applications yet.</Empty>
      )}

      <div className="space-y-2">
        {applications.data?.map((a) => {
          const open = openId === a.id;
          return (
            <div key={a.id} className="rounded-lg border border-line">
              <button
                onClick={() => setOpenId(open ? null : a.id)}
                className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    Dr {a.firstName} {a.lastName}
                  </div>
                  <div className="text-xs text-muted">
                    {a.specialty} · {a.yearsExperience} ·{" "}
                    {EMPLOYMENT_LABEL[a.employment] ?? a.employment}
                  </div>
                  <div className="text-xs text-muted">
                    Applied {shortDate(a.createdAt)}
                  </div>
                </div>
                <Chip className={STATUS_STYLE[a.status] ?? ""}>{a.status}</Chip>
              </button>

              {open && (
                <div className="border-t border-line px-4 py-3">
                  <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <Field label="Email">{a.email}</Field>
                    <Field label="Phone">{a.phone}</Field>
                    <Field label="AHPRA number">
                      <span className="font-mono">{a.ahpraNumber}</span>
                      <span className="ml-2 text-[11px] text-amber-700">
                        not verified against the register
                      </span>
                    </Field>
                    <Field label="Experience">{a.yearsExperience}</Field>
                  </dl>

                  {a.coverLetter && (
                    <div className="mt-3">
                      <div className="text-[11px] text-muted">Cover letter</div>
                      <p className="mt-0.5 text-sm whitespace-pre-wrap">
                        {a.coverLetter}
                      </p>
                    </div>
                  )}

                  {a.reviewedAt && (
                    <p className="mt-3 text-xs text-muted">
                      Reviewed {shortDate(a.reviewedAt)}
                      {a.reviewNote ? ` — ${a.reviewNote}` : ""}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["reviewing", "accepted", "declined"] as const).map((s) => (
                      <Button
                        key={s}
                        variant={
                          s === "accepted"
                            ? "success"
                            : s === "declined"
                              ? "danger"
                              : "outline"
                        }
                        className="!py-1 text-xs capitalize"
                        disabled={a.status === s || review.isPending}
                        onClick={() => review.mutate({ id: a.id, status: s })}
                      >
                        Mark {s}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
