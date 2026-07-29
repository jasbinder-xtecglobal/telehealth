import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export type MapStop = {
  visitId: string;
  patientName: string;
  suburb: string | null;
  latitude: number | null;
  longitude: number | null;
  acuity: number;
  routeOrder: number | null;
  status: string;
  safetyLevel: "ok" | "due" | "overdue" | "escalate";
};

type Props = {
  stops: MapStop[];
  origin: { latitude: number; longitude: number } | null;
  selectedId: string | null;
  onSelect: (visitId: string) => void;
};

const ACUITY_COLOUR: Record<number, string> = {
  1: "#c0392b",
  2: "#e07a1f",
  3: "#c9a227",
  4: "#4a5b6c",
  5: "#8a97a4",
};

/**
 * Leaflet map of a doctor's run.
 *
 * Wraps Leaflet imperatively rather than via react-leaflet — fewer moving
 * parts, and the map instance survives re-renders. Tiles come from
 * OpenStreetMap, so the map needs network access at runtime.
 */
export function RouteMap({ stops, origin, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [origin?.latitude ?? -37.8136, origin?.longitude ?? 144.9631],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw markers and the route line whenever the run changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const located = stops.filter(
      (s): s is MapStop & { latitude: number; longitude: number } =>
        s.latitude !== null && s.longitude !== null,
    );

    const bounds: L.LatLngExpression[] = [];

    if (origin) {
      bounds.push([origin.latitude, origin.longitude]);
      L.marker([origin.latitude, origin.longitude], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:16px;height:16px;border-radius:50%;background:#0e7c86;border:3px solid #fff;box-shadow:0 0 0 1px #0e7c86"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      })
        .bindTooltip("You are here", { direction: "top" })
        .addTo(layer);
    }

    const ordered = [...located].sort(
      (a, b) => (a.routeOrder ?? 99) - (b.routeOrder ?? 99),
    );

    // Route line through sequenced stops only.
    const linePoints: L.LatLngExpression[] = [];
    if (origin) linePoints.push([origin.latitude, origin.longitude]);
    for (const s of ordered) {
      if (s.routeOrder !== null) linePoints.push([s.latitude, s.longitude]);
    }
    if (linePoints.length > 1) {
      L.polyline(linePoints, {
        color: "#0e7c86",
        weight: 3,
        opacity: 0.6,
        dashArray: "6 6",
      }).addTo(layer);
    }

    for (const s of ordered) {
      bounds.push([s.latitude, s.longitude]);

      const colour = ACUITY_COLOUR[s.acuity] ?? "#4a5b6c";
      const alarm = s.safetyLevel === "escalate" || s.safetyLevel === "overdue";
      const label = s.routeOrder ?? "•";
      const selected = s.visitId === selectedId;

      const marker = L.marker([s.latitude, s.longitude], {
        icon: L.divIcon({
          className: "",
          html: `<div style="
            width:26px;height:26px;border-radius:50%;
            background:${colour};color:#fff;
            display:flex;align-items:center;justify-content:center;
            font:600 12px/1 'Segoe UI',sans-serif;
            border:${selected ? "3px solid #14202b" : "2px solid #fff"};
            box-shadow:0 1px 4px rgba(0,0,0,.4)${alarm ? ",0 0 0 6px rgba(192,57,43,.25)" : ""};
          ">${label}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      });

      marker
        .bindTooltip(
          `<strong>${s.patientName}</strong><br>${s.suburb ?? ""}<br>${s.status.replace(/_/g, " ")}`,
          { direction: "top" },
        )
        .on("click", () => onSelectRef.current(s.visitId))
        .addTo(layer);
    }

    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0]!, 13);
    }
  }, [stops, origin, selectedId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
