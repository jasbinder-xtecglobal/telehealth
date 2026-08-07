import {
  optimiseRoute,
  type RouteStop,
} from "../../domain/dispatch/routing.policy.ts";
import type { RouteLeg, RoutePoint, RoutingPort } from "../ports.ts";

/**
 * Straight-line routing.
 *
 * Delegates sequencing to the domain policy and reports distances as
 * great-circle rather than road distance, so ETAs are optimistic. Replacing
 * this with Google Directions or Mapbox means implementing `RoutingPort` and
 * changing one line in the composition root — the acuity-banding rule stays in
 * the domain and is unaffected.
 */
export class HaversineRoutingAdapter implements RoutingPort {
  constructor(
    private readonly averageSpeedKmh = 32,
    private readonly minutesOnScene = 20,
  ) {}

  async optimise(input: {
    origin: RoutePoint;
    stops: (RoutePoint & { id: string; label: string; acuity: number })[];
  }): Promise<RouteLeg[]> {
    const stops: RouteStop[] = input.stops.map((s) => ({
      id: s.id,
      label: s.label,
      acuity: s.acuity,
      latitude: s.latitude,
      longitude: s.longitude,
    }));

    const routed = optimiseRoute(input.origin, stops, {
      averageSpeedKmh: this.averageSpeedKmh,
      minutesOnScene: this.minutesOnScene,
    });

    return routed.map((r) => ({
      id: r.id,
      order: r.order,
      distanceKm: r.cumulativeKm,
      etaMinutes: r.etaMinutes,
    }));
  }
}
