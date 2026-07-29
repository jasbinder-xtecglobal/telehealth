import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button, Chip, Field, Modal, Spinner, Textarea } from "@/shared/ui/index.tsx";
import { ACUITY_META, CATEGORY_LABELS, waitLabel } from "@/shared/lib/format.ts";
import { useTRPC } from "@/shared/lib/trpc.ts";
import { RouteMap } from "../components/RouteMap.tsx";

type View = "both" | "list" | "map";

const SAFETY_STYLE: Record<string, string> = {
  ok: "border-slate-200 bg-slate-100 text-slate-600",
  due: "border-amber-200 bg-amber-50 text-amber-700",
  overdue: "border-orange-300 bg-orange-100 text-orange-800",
  escalate: "border-red-300 bg-red-100 text-red-800",
};

/**
 * Home-visit dispatch board.
 *
 * Three things at once: where the patients are, what order to see them in, and
 * whether anyone is overdue to check out.
 */
export function DispatchBoard() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [view, setView] = useState<View>("both");
  const [selected, setSelected] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const me = useQuery(trpc.doctor.me.queryOptions());
  const board = useQuery({
    ...trpc.dispatch.board.queryOptions(),
    refetchInterval: 10_000,
  });
  const alerts = useQuery({
    ...trpc.dispatch.openAlerts.queryOptions(),
    refetchInterval: 10_000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: trpc.dispatch.board.queryKey() });
    qc.invalidateQueries({ queryKey: trpc.dispatch.openAlerts.queryKey() });
  };

  const onError = (e: { message: string }) => setError(e.message);

  const accept = useMutation(trpc.dispatch.accept.mutationOptions({ onSuccess: refresh, onError }));
  const decline = useMutation(
    trpc.dispatch.decline.mutationOptions({
      onSuccess: () => {
        setDeclining(null);
        setReason("");
        refresh();
      },
      onError,
    }),
  );
  const departFor = useMutation(trpc.dispatch.departFor.mutationOptions({ onSuccess: refresh, onError }));
  const arrive = useMutation(trpc.dispatch.arrive.mutationOptions({ onSuccess: refresh, onError }));
  const depart = useMutation(trpc.dispatch.depart.mutationOptions({ onSuccess: refresh, onError }));
  const optimise = useMutation(trpc.dispatch.optimiseRoute.mutationOptions({ onSuccess: refresh, onError }));
  const panic = useMutation(trpc.dispatch.raisePanic.mutationOptions({ onSuccess: refresh, onError }));
  const resolveAlert = useMutation(trpc.dispatch.resolveAlert.mutationOptions({ onSuccess: refresh, onError }));
  const sweep = useMutation(trpc.dispatch.runSafetySweep.mutationOptions({ onSuccess: refresh }));

  // The escalation timer must fire whether or not a dispatcher is watching.
  useEffect(() => {
    const id = setInterval(() => sweep.mutate(), 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visits = board.data ?? [];
  const mine = visits.filter((v) => v.doctorId === me.data?.id);
  const unassigned = visits.filter((v) => v.status === "unassigned");
  const origin =
    me.data?.latitude && me.data?.longitude
      ? { latitude: Number(me.data.latitude), longitude: Number(me.data.longitude) }
      : null;

  const mapStops = (mine.length > 0 ? mine : visits).map((v) => ({
    visitId: v.visitId,
    patientName: v.patientName,
    suburb: v.suburb,
    latitude: v.latitude,
    longitude: v.longitude,
    acuity: v.acuity,
    routeOrder: v.routeOrder,
    status: v.status,
    safetyLevel: v.safety.level,
  }));

  const onScene = mine.find((v) => v.status === "on_scene");

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---------------- toolbar ---------------- */}
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="!py-1 text-xs"
            disabled={optimise.isPending}
            onClick={() => optimise.mutate()}
          >
            {optimise.isPending ? "Optimising…" : "Optimise Route"}
          </Button>
          <span className="text-xs text-muted">
            {mine.length} assigned · {unassigned.length} unassigned
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="danger"
            className="!py-1 text-xs"
            onClick={() => panic.mutate({ visitId: onScene?.visitId })}
          >
            Panic
          </Button>
          <div className="flex gap-1">
            {(["list", "map", "both"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded border px-2 py-1 text-xs capitalize ${
                  view === v
                    ? "border-brand bg-slate-50 text-brand-dark"
                    : "border-line text-muted"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- duress banner ---------------- */}
      {(alerts.data?.length ?? 0) > 0 && (
        <div className="shrink-0 border-b border-red-300 bg-red-50 px-4 py-2">
          {alerts.data!.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-0.5">
              <div className="text-sm text-red-900">
                <strong>
                  {a.source === "panic" ? "Panic button" : "Overdue check-out"}
                </strong>
                {a.note ? ` — ${a.note}` : ""}
              </div>
              <Button
                variant="outline"
                className="!py-0.5 text-xs"
                onClick={() => resolveAlert.mutate({ alertId: a.id })}
              >
                Mark safe
              </Button>
            </div>
          ))}
        </div>
      )}

      {board.isLoading && <Spinner />}

      <div
        className={`grid min-h-0 flex-1 ${
          view === "both"
            ? "grid-cols-[minmax(340px,420px)_minmax(0,1fr)]"
            : "grid-cols-1"
        }`}
      >
        {/* ---------------- list ---------------- */}
        {view !== "map" && (
          <div className="min-h-0 overflow-y-auto border-r border-line">
            {visits.length === 0 && !board.isLoading && (
              <p className="py-16 text-center text-sm text-muted">
                No home visits waiting.
              </p>
            )}

            {visits.map((v) => {
              const acuity = ACUITY_META[v.acuity] ?? ACUITY_META[4]!;
              const isMine = v.doctorId === me.data?.id;

              return (
                <div
                  key={v.visitId}
                  onClick={() => setSelected(v.visitId)}
                  className={`cursor-pointer border-b border-line px-4 py-3 transition-colors ${
                    selected === v.visitId ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    {v.routeOrder !== null && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-dark text-[10px] font-bold text-white">
                        {v.routeOrder}
                      </span>
                    )}
                    <Chip className={acuity.className}>{acuity.label}</Chip>
                    <Chip className="border-slate-200 bg-slate-100 text-slate-600">
                      {v.status.replace(/_/g, " ")}
                    </Chip>
                    {v.safety.level !== "ok" && (
                      <Chip className={SAFETY_STYLE[v.safety.level]!}>
                        {v.safety.level}
                      </Chip>
                    )}
                  </div>

                  <div className="text-sm font-semibold">{v.patientName}</div>
                  <div className="text-xs text-muted">{v.address}</div>
                  <div className="mt-0.5 truncate text-[13px] text-muted">
                    <span className="text-ink">
                      {CATEGORY_LABELS[v.symptom] ?? v.symptom}:
                    </span>{" "}
                    {v.additionalInfo}
                  </div>

                  {(v.etaMinutes !== null || v.distanceKm !== null) && (
                    <div className="mt-1 text-[11px] text-brand-dark">
                      {v.etaMinutes !== null && `ETA ~${v.etaMinutes} min`}
                      {v.distanceKm !== null && ` · ${v.distanceKm} km into run`}
                    </div>
                  )}

                  {v.safety.level !== "ok" && (
                    <div className="mt-1 text-[11px] font-medium text-red-700">
                      {v.safety.message}
                    </div>
                  )}

                  {/* ---- actions ---- */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {v.status === "unassigned" && (
                      <Button
                        variant="primary"
                        className="!py-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          accept.mutate({ visitId: v.visitId });
                        }}
                      >
                        Accept
                      </Button>
                    )}

                    {isMine && v.status === "accepted" && (
                      <>
                        <Button
                          variant="primary"
                          className="!py-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            departFor.mutate({ visitId: v.visitId });
                          }}
                        >
                          Start driving
                        </Button>
                        <Button
                          variant="outline"
                          className="!py-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeclining(v.visitId);
                          }}
                        >
                          Decline
                        </Button>
                      </>
                    )}

                    {isMine && v.status === "en_route" && (
                      <Button
                        variant="success"
                        className="!py-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          arrive.mutate({ visitId: v.visitId });
                        }}
                      >
                        Check in on arrival
                      </Button>
                    )}

                    {isMine && v.status === "on_scene" && (
                      <Button
                        variant="success"
                        className="!py-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          depart.mutate({ visitId: v.visitId });
                        }}
                      >
                        Check out
                      </Button>
                    )}

                    {isMine && (
                      <Button
                        variant="ghost"
                        className="!py-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/consult/${v.consultId}`);
                        }}
                      >
                        Open consult
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------- map ---------------- */}
        {view !== "list" && (
          <div className="relative min-h-0">
            <RouteMap
              stops={mapStops}
              origin={origin}
              selectedId={selected}
              onSelect={setSelected}
            />
            {!origin && (
              <div className="pointer-events-none absolute top-3 left-3 z-[1000] rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 shadow">
                No recorded position for you — route is planned from the CBD.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------- decline ---------------- */}
      <Modal
        open={Boolean(declining)}
        onClose={() => setDeclining(null)}
        title="Decline this visit"
        width="max-w-lg"
      >
        <p className="mb-3 text-sm text-muted">
          The visit returns to the pool for another doctor. The reason is audited.
        </p>
        <Field label="Reason">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. outside my coverage area tonight"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setDeclining(null)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 3 || decline.isPending}
            onClick={() =>
              decline.mutate({ visitId: declining!, reason: reason.trim() })
            }
          >
            Decline visit
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(error)}
        onClose={() => setError(null)}
        title="Cannot proceed"
        width="max-w-md"
      >
        <Alert tone="danger">{error}</Alert>
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setError(null)}>
            OK
          </Button>
        </div>
      </Modal>
    </div>
  );
}
