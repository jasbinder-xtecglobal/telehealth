import type { ReactNode } from "react";

/**
 * Shared shell for the unauthenticated screens.
 *
 * These carry the public site's theme rather than the console's. They are the
 * seam between the two: a doctor arrives here from the website's Login link,
 * and a screen that looks like a different product at that moment reads as a
 * phishing page. Past sign-in, the console reverts to its own dense styling,
 * which is tuned for a night shift rather than a first impression.
 *
 * The tokens live in `auth-theme.css`, scoped to `.auth-theme` so they cannot
 * leak into the clinical screens.
 */
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
    <div className="auth-theme flex min-h-full items-center justify-center bg-gradient-to-br from-[#F0F7FF] via-white to-[#E6F7F9] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mb-4 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A6EBD] to-[#0099A8]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 11h2V9h2v2h2v2h-2v2h-2v-2H9v-2z" fill="white" />
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  stroke="white"
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.5"
                />
              </svg>
            </div>
            <span className="auth-display text-2xl text-[#0A6EBD]">Telehealth</span>
          </div>
          <h1 className="auth-display text-2xl text-[#0A1628]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-[#64748B]">{subtitle}</p>}
        </div>

        <div className="rounded-3xl border border-[#E2EBF6] bg-white p-6 shadow-sm">
          {children}
        </div>

        {footer && (
          <div className="mt-5 text-center text-sm text-[#64748B]">{footer}</div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#94A3B8]">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
          </svg>
          Session secured with an httpOnly cookie over TLS
        </div>
      </div>
    </div>
  );
}
