import type { ReactNode } from "react";

/** Shared shell for the unauthenticated screens. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-1 text-lg font-bold tracking-tight text-brand-dark">
            After-Hours Clinician Console
          </div>
          <div className="text-xs text-muted">Medicare bulk-billed after-hours service</div>
        </div>

        <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 mb-4 text-sm text-muted">{subtitle}</p>}
          <div className={subtitle ? "" : "mt-4"}>{children}</div>
        </div>

        {footer && <div className="mt-4 text-center text-sm">{footer}</div>}
      </div>
    </div>
  );
}
