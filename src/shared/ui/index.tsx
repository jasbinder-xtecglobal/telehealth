import type { ReactNode } from "react";
import { useEffect } from "react";

/* ------------------------------------------------------------------ *
 * Button
 * ------------------------------------------------------------------ */
type Variant = "primary" | "outline" | "danger" | "ghost" | "success";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[#2f7fd1] text-white border-[#2f7fd1] hover:bg-[#2a71ba] disabled:bg-slate-300 disabled:border-slate-300",
  outline:
    "bg-white text-ink border-line hover:bg-slate-50 disabled:text-slate-400",
  danger:
    "bg-[#e05a50] text-white border-[#e05a50] hover:bg-[#d13c31] disabled:bg-slate-300 disabled:border-slate-300",
  success:
    "bg-[#2f9e5f] text-white border-[#2f9e5f] hover:bg-[#278350] disabled:bg-slate-300 disabled:border-slate-300",
  ghost: "bg-transparent text-muted border-transparent hover:bg-slate-100",
};

export function Button({
  variant = "outline",
  className = "",
  full,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  full?: boolean;
}) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${full ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Modal
 * ------------------------------------------------------------------ */
export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-6">
      <div
        className={`mt-8 w-full ${width} rounded-lg bg-white shadow-xl`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-slate-100"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Form primitives
 * ------------------------------------------------------------------ */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:bg-slate-50";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputCls} resize-y font-mono text-[13px] leading-relaxed ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

/* ------------------------------------------------------------------ *
 * Feedback
 * ------------------------------------------------------------------ */
export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "danger" | "success";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
    success: "border-green-200 bg-green-50 text-green-900",
  };
  return (
    <div className={`mb-3 rounded border px-3.5 py-2.5 text-sm ${tones[tone]}`}>
      {title && <div className="mb-0.5 font-semibold">{title}</div>}
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="py-16 text-center text-sm text-muted">{children}</div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
    </div>
  );
}

export function Chip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}
