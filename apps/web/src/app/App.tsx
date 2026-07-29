import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { Account } from "@/features/account/routes/Account.tsx";
import {
  Billing,
  ConsultHistory,
  Inbox,
  PanicButton,
  Support,
} from "@/features/admin/routes/AdminRoutes.tsx";
import { Login } from "@/features/auth/routes/Login.tsx";
import { Signup } from "@/features/auth/routes/Signup.tsx";
import { VerifyEmail } from "@/features/auth/routes/VerifyEmail.tsx";
import { ConsultConsole } from "@/features/consult/routes/ConsultConsole.tsx";
import { PatientDetail } from "@/features/queue/routes/PatientDetail.tsx";
import { WaitingRoom } from "@/features/queue/routes/WaitingRoom.tsx";
import { AppShell } from "@/shared/layout/AppShell.tsx";
import { useTRPC } from "@/shared/lib/trpc.ts";
import { Spinner } from "@/shared/ui/index.tsx";

/**
 * Gate for everything clinical.
 *
 * `auth.session` returns null rather than 401 for a signed-out visitor, so the
 * app can decide where to route without treating a normal state as an error.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const trpc = useTRPC();
  const location = useLocation();

  const session = useQuery({
    ...trpc.auth.session.queryOptions(),
    retry: false,
    staleTime: 30_000,
  });

  if (session.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session.data) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      {/* -------- public -------- */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify" element={<VerifyEmail />} />

      {/* -------- authenticated -------- */}
      <Route
        path="*"
        element={
          <RequireAuth>
            <AppShell>
              <Routes>
                <Route path="/" element={<WaitingRoom />} />
                <Route path="/patient/:consultId" element={<PatientDetail />} />
                <Route path="/consult/:consultId" element={<ConsultConsole />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/history" element={<ConsultHistory />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/support" element={<Support />} />
                <Route path="/account" element={<Account />} />
                <Route path="/panic" element={<PanicButton />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
