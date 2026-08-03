/**
 * Billing statement rollup.
 *
 * A doctor reconciles earnings by week, then drills into a day, then into the
 * individual consult. The arithmetic is the point — a wrong subtotal is a
 * dispute with Medicare — so it lives here, pure and tested, rather than being
 * re-derived in the UI.
 *
 * Weeks run Monday to Sunday. Australian practice weeks and the reference
 * software both do; a Sunday-start week would split a Saturday night shift
 * across two subtotals.
 */

export type StatementLine = {
  consultId: string;
  patientName: string;
  dob: string;
  gender: string | null;
  /** When the consult closed — the event that makes it billable. */
  endedAt: Date;
  category: string;
  /** MBS items claimed. Empty when the doctor recorded "no billing". */
  itemNumbers: string[];
  fee: number;
  billed: boolean;
};

export type DayGroup = {
  /** ISO date (YYYY-MM-DD) in local time — the grouping key. */
  date: string;
  consultCount: number;
  total: number;
  lines: StatementLine[];
};

export type WeekGroup = {
  weekStart: string;
  weekEnd: string;
  consultCount: number;
  total: number;
  days: DayGroup[];
};

export type Statement = {
  weeks: WeekGroup[];
  consultCount: number;
  total: number;
};

/**
 * A consult is incompletely billed when no billing decision was recorded at
 * all, or a claim was recorded but has not yet been submitted to Medicare.
 * Both are money the doctor has not been paid, which is what the filter is for.
 */
export function isBillingIncomplete(
  billings: readonly { status: string }[],
): boolean {
  return billings.length === 0 || billings.some((b) => b.status === "pending");
}

/** Local-time YYYY-MM-DD. Not `toISOString`, which shifts to UTC. */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `d`, at midnight local. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // getDay(): 0 = Sunday. Sunday belongs to the week that began six days ago.
  const shift = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - shift);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Rounds to cents so repeated float addition cannot drift a subtotal. */
function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Groups lines into Monday-start weeks, then days, newest first at every
 * level, and totals as it goes.
 */
export function buildStatement(lines: readonly StatementLine[]): Statement {
  const byWeek = new Map<string, Map<string, StatementLine[]>>();

  for (const line of lines) {
    const weekKey = isoDate(startOfWeek(line.endedAt));
    const dayKey = isoDate(line.endedAt);

    let days = byWeek.get(weekKey);
    if (!days) {
      days = new Map();
      byWeek.set(weekKey, days);
    }
    const bucket = days.get(dayKey);
    if (bucket) bucket.push(line);
    else days.set(dayKey, [line]);
  }

  const weeks: WeekGroup[] = [...byWeek.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([weekStart, dayMap]) => {
      const days: DayGroup[] = [...dayMap.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, dayLines]) => ({
          date,
          consultCount: dayLines.length,
          total: cents(dayLines.reduce((s, l) => s + l.fee, 0)),
          lines: [...dayLines].sort(
            (a, b) => b.endedAt.getTime() - a.endedAt.getTime(),
          ),
        }));

      return {
        weekStart,
        weekEnd: isoDate(addDays(new Date(`${weekStart}T00:00:00`), 6)),
        consultCount: days.reduce((s, d) => s + d.consultCount, 0),
        total: cents(days.reduce((s, d) => s + d.total, 0)),
        days,
      };
    });

  return {
    weeks,
    consultCount: lines.length,
    total: cents(lines.reduce((s, l) => s + l.fee, 0)),
  };
}
