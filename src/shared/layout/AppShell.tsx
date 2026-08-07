import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { unreadUpdateCount } from "@/features/updates/patch-notes.ts";
import { money } from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";

/**
 * Sidebar order mirrors the reference console. `badge` names a live counter
 * the item paints; `external` opens outside the app entirely.
 */
const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/inbox", label: "Inbox", badge: "inbox" as const },
  { to: "/history", label: "Consult History" },
  { to: "/billing", label: "Billing" },
  { to: "/support", label: "Support" },
  { to: "/updates", label: "Software Updates", badge: "updates" as const },
  { to: "/account", label: "My Account" },
  { to: "/applications", label: "Doctor Applications", badge: "applications" as const },
  { to: "/panic", label: "Panic Button" },
];

/**
 * Therapeutic Guidelines. A licensed third-party product — the reference
 * console links straight out to it rather than embedding it.
 */
const ETG_URL = "https://app.tg.org.au";

export function AppShell({ children }: { children: ReactNode }) {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const logout = useMutation(
    trpc.auth.logout.mutationOptions({
      onSuccess: () => {
        // Drop every cached query — none of it belongs to the next person
        // to sit at this workstation.
        qc.clear();
        navigate("/login", { replace: true });
      },
    }),
  );

  const stats = useQuery({
    ...trpc.queue.stats.queryOptions(),
    refetchInterval: 5_000,
  });
  const me = useQuery(trpc.doctor.me.queryOptions());
  const roster = useQuery({
    ...trpc.doctor.roster.queryOptions(),
    refetchInterval: 15_000,
  });
  const inbox = useQuery({
    ...trpc.doctor.inbox.queryOptions(),
    refetchInterval: 30_000,
  });
  const applications = useQuery({
    ...trpc.intake.applications.queryOptions(),
    refetchInterval: 60_000,
  });

  const s = stats.data;

  // The unread marker is browser-local, so it has no query to invalidate.
  // Reading it against the current location recomputes it on navigation,
  // which is when it can actually have changed.
  const location = useLocation();
  const badges = {
    inbox: inbox.data?.length ?? 0,
    updates: location.pathname === "/updates" ? 0 : unreadUpdateCount(),
    applications:
      applications.data?.filter((a) => a.status === "submitted").length ?? 0,
  };

  return (
    <div
      className={`flex h-full flex-col ${me.data?.largeFont ? "large-font" : ""}`}
    >
      {/* ---------------- header ---------------- */}
      <header className="flex shrink-0 items-center border-b border-line bg-white px-5 py-2">
        <div className="w-64">
          <div className="text-base font-bold text-[#2f9e5f]">
            {money(s?.billedToday ?? 0)} / {money(s?.billedWeek ?? 0)}
          </div>
          <div className="text-[11px] text-muted">Billings</div>
        </div>

        <div className="flex-1 text-center">
          <div className="text-base font-bold text-[#2f7fd1]">
            {s?.seenToday ?? 0} / {s?.businessToday ?? 0}
          </div>
          <div className="text-[11px] text-muted">Patients</div>
        </div>

        <div className="flex w-64 items-center justify-end gap-5">
          <div className="text-right">
            <div className="text-base font-bold text-[#d13c31]">
              {s?.queued ?? 0}
            </div>
            <div className="text-[11px] text-muted">Queue</div>
          </div>
          <div className="relative">
            <svg
              className="absolute top-2 left-2.5 text-muted"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              placeholder="Search patient"
              className="w-44 rounded border border-line py-1.5 pr-2 pl-8 text-xs outline-none focus:border-brand"
            />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ---------------- sidebar ---------------- */}
        <aside className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-line bg-white">
          <nav className="py-2">
            {NAV.map((n) => {
              const count = n.badge ? badges[n.badge] : 0;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 border-l-[3px] px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? "border-brand bg-slate-50 font-medium text-brand-dark"
                        : "border-transparent text-ink hover:bg-slate-50"
                    }`
                  }
                >
                  {n.label}
                  {count > 0 && (
                    <span
                      className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d13c31] px-1 text-[10px] font-bold text-white"
                      title={`${count} awaiting your attention`}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </NavLink>
              );
            })}

            <a
              href={ETG_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 border-l-[3px] border-transparent px-4 py-2 text-sm text-ink hover:bg-slate-50"
            >
              eTG
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-muted"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
              </svg>
            </a>
          </nav>

          <div className="mt-1 border-t border-line px-4 py-2">
            <button
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="text-sm text-ink hover:text-brand-dark disabled:text-muted"
            >
              {logout.isPending ? "Signing out…" : "Logout"}
            </button>
          </div>

          <div className="border-t border-line px-4 py-3">
            <div className="mb-2 text-[11px] text-muted">Online users</div>
            <ul className="space-y-1">
              {roster.data?.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      d.isOnline ? "bg-[#2f9e5f]" : "bg-slate-300"
                    }`}
                  />
                  <span
                    className={`truncate ${d.id === me.data?.id ? "font-semibold" : ""}`}
                  >
                    {d.firstName} (Doctor) {d.lastName}
                  </span>
                  {d.id === me.data?.id && (
                    <span className="text-[10px] text-muted">you</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {me.data && (
            <div className="mt-auto border-t border-line px-4 py-3">
              <div className="truncate text-xs font-semibold">
                Dr {me.data.chosenName ?? `${me.data.firstName} ${me.data.lastName}`}
              </div>
              <div className="truncate text-[11px] text-muted">{me.data.email}</div>
              <div className="mt-0.5 text-[10px] text-muted">
                Provider {me.data.providerNumber}
              </div>
            </div>
          )}
        </aside>

        {/* ---------------- main ---------------- */}
        <main className="min-w-0 flex-1 overflow-hidden bg-white">{children}</main>
      </div>
    </div>
  );
}
