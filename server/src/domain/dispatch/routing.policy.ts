/**
 * Route sequencing for home visits.
 *
 * Pure geometry and ordering — no map provider, no network, no clock. A real
 * deployment substitutes road distances via `RoutingPort`; the shape of the
 * answer, and the rule about what order to visit people in, stay here.
 */

export type GeoPoint = { latitude: number; longitude: number };

export type RouteStop = GeoPoint & {
  id: string;
  label: string;
  /** 1 (most urgent) – 5. Drives banding, see `optimiseRoute`. */
  acuity: number;
};

export type RoutedStop = RouteStop & {
  order: number;
  /** Straight-line distance from the previous point. */
  legKm: number;
  cumulativeKm: number;
  /** Minutes from departure until arrival at this stop. */
  etaMinutes: number;
};

export type RouteOptions = {
  averageSpeedKmh?: number;
  minutesOnScene?: number;
};

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance. Straight-line, so it under-reads real road distance. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function travelMinutes(km: number, averageSpeedKmh = 32): number {
  if (averageSpeedKmh <= 0) return 0;
  return (km / averageSpeedKmh) * 60;
}

/**
 * Urgent work is not allowed to wait behind convenient work.
 *
 * Acuity 1–2 forms an urgent band that is always sequenced ahead of the rest,
 * even when a routine patient is closer. Within each band the route is
 * nearest-neighbour from the previous stop.
 *
 * Nearest-neighbour is not an optimal tour, but it is stable, explainable to a
 * doctor looking at the map, and adequate for the handful of stops one car
 * covers in a shift.
 */
export function optimiseRoute(
  origin: GeoPoint,
  stops: readonly RouteStop[],
  options: RouteOptions = {},
): RoutedStop[] {
  const { averageSpeedKmh = 32, minutesOnScene = 20 } = options;

  const urgent = stops.filter((s) => s.acuity <= 2);
  const routine = stops.filter((s) => s.acuity > 2);

  const sequenced: RouteStop[] = [];
  let cursor: GeoPoint = origin;

  for (const band of [urgent, routine]) {
    const remaining = [...band];
    while (remaining.length > 0) {
      let bestIndex = 0;
      let bestKm = Number.POSITIVE_INFINITY;

      for (let i = 0; i < remaining.length; i++) {
        const km = haversineKm(cursor, remaining[i]!);
        if (km < bestKm) {
          bestKm = km;
          bestIndex = i;
        }
      }

      const [next] = remaining.splice(bestIndex, 1);
      sequenced.push(next!);
      cursor = next!;
    }
  }

  const routed: RoutedStop[] = [];
  let previous: GeoPoint = origin;
  let cumulativeKm = 0;
  let clockMinutes = 0;

  sequenced.forEach((stop, index) => {
    const legKm = haversineKm(previous, stop);
    cumulativeKm += legKm;
    clockMinutes += travelMinutes(legKm, averageSpeedKmh);

    routed.push({
      ...stop,
      order: index + 1,
      legKm: round(legKm),
      cumulativeKm: round(cumulativeKm),
      etaMinutes: Math.round(clockMinutes),
    });

    // The next leg cannot start until this consultation finishes.
    clockMinutes += minutesOnScene;
    previous = stop;
  });

  return routed;
}

/** Total distance of a sequenced run, for comparing against an alternative. */
export function totalKm(route: readonly RoutedStop[]): number {
  return route.length === 0 ? 0 : round(route[route.length - 1]!.cumulativeKm);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
