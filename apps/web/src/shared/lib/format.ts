export const CATEGORY_LABELS: Record<string, string> = {
  mens_health: "Men's Health",
  womens_health: "Women's Health",
  gut_related: "Gut Related",
  skin: "Skin",
  mental_health_sleep_headache: "Mental Health / Sleep / Headache",
  medical_certificate_only: "Medical Certificate Only",
  prescribed_weight_loss: "Prescribed Weight Loss",
  opioids: "Opioids",
  other_issues: "Other Issues",
};

export const DOCUMENT_TYPES = [
  "med_cert_work",
  "med_cert_school",
  "med_cert_university",
  "med_cert_carers",
  "fit_to_return",
  "blank",
] as const;

export type DocumentTypeKey = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentTypeKey, string> = {
  med_cert_work: "Medical certificate — work",
  med_cert_school: "Medical certificate — school",
  med_cert_university: "Medical certificate — university",
  med_cert_carers: "Carer's certificate",
  fit_to_return: "Fit to return to work",
  blank: "Patient instructions",
};

export const DOCTOR_TYPE_LABELS: Record<string, string> = {
  gp_fellow: "GP Fellow",
  vr: "VR General Practitioner",
  non_vr: "Non-VR",
  registrar: "Registrar",
};

export function waitedMinutes(from: Date | string): number {
  const t = typeof from === "string" ? new Date(from) : from;
  return Math.max(0, Math.floor((Date.now() - t.getTime()) / 60_000));
}

export function waitLabel(from: Date | string): string {
  const m = waitedMinutes(from);
  if (m < 60) return `${m} min${m === 1 ? "" : "s"}`;
  const h = Math.floor(m / 60);
  return `${h} hr ${m % 60} min`;
}

export function money(n: number): string {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  });
}

export function shortDate(d: Date | string | null): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function clockTime(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

export function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

/** 1 = most urgent. Used for the acuity chip in the queue. */
export const ACUITY_META: Record<number, { label: string; className: string }> = {
  1: { label: "Urgent", className: "bg-red-100 text-red-700 border-red-200" },
  2: { label: "High", className: "bg-orange-100 text-orange-700 border-orange-200" },
  3: { label: "Moderate", className: "bg-amber-100 text-amber-700 border-amber-200" },
  4: { label: "Routine", className: "bg-slate-100 text-slate-600 border-slate-200" },
  5: { label: "Low", className: "bg-slate-100 text-slate-500 border-slate-200" },
};
