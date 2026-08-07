import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  haversineKm,
  optimiseRoute,
  totalKm,
  travelMinutes,
  type RouteStop,
} from "./routing.policy.ts";

const MELBOURNE_CBD = { latitude: -37.8136, longitude: 144.9631 };

function stop(
  id: string,
  latitude: number,
  longitude: number,
  acuity = 4,
): RouteStop {
  return { id, label: id, latitude, longitude, acuity };
}

describe("haversine", () => {
  it("returns zero for the same point", () => {
    assert.equal(haversineKm(MELBOURNE_CBD, MELBOURNE_CBD), 0);
  });

  it("measures a known distance within tolerance", () => {
    // Melbourne CBD → Geelong is roughly 64 km straight line.
    const geelong = { latitude: -38.1499, longitude: 144.3617 };
    const km = haversineKm(MELBOURNE_CBD, geelong);
    assert.ok(km > 60 && km < 70, `expected ~64 km, got ${km.toFixed(1)}`);
  });

  it("is symmetric", () => {
    const a = { latitude: -37.77, longitude: 144.96 };
    const b = { latitude: -37.82, longitude: 145.0 };
    assert.equal(haversineKm(a, b).toFixed(6), haversineKm(b, a).toFixed(6));
  });
});

describe("travel time", () => {
  it("converts distance to minutes at the given speed", () => {
    assert.equal(Math.round(travelMinutes(32, 32)), 60);
    assert.equal(Math.round(travelMinutes(16, 32)), 30);
  });

  it("never divides by zero", () => {
    assert.equal(travelMinutes(10, 0), 0);
  });
});

describe("route sequencing", () => {
  it("visits the nearest routine stop first", () => {
    const near = stop("near", -37.8156, 144.9651);
    const far = stop("far", -37.9, 145.1);

    const route = optimiseRoute(MELBOURNE_CBD, [far, near]);
    assert.deepEqual(route.map((r) => r.id), ["near", "far"]);
    assert.deepEqual(route.map((r) => r.order), [1, 2]);
  });

  it("puts an urgent stop ahead of a closer routine one", () => {
    const closeRoutine = stop("routine", -37.8146, 144.9641, 4);
    const distantUrgent = stop("urgent", -37.95, 145.15, 1);

    const route = optimiseRoute(MELBOURNE_CBD, [closeRoutine, distantUrgent]);
    assert.equal(
      route[0]!.id,
      "urgent",
      "an urgent patient must not wait behind a convenient one",
    );
    assert.equal(route[1]!.id, "routine");
  });

  it("keeps nearest-neighbour ordering within the urgent band", () => {
    const urgentNear = stop("urgent-near", -37.8156, 144.9651, 2);
    const urgentFar = stop("urgent-far", -37.95, 145.15, 1);
    const routine = stop("routine", -37.82, 144.97, 4);

    const route = optimiseRoute(MELBOURNE_CBD, [urgentFar, urgentNear, routine]);
    assert.deepEqual(route.map((r) => r.id), [
      "urgent-near",
      "urgent-far",
      "routine",
    ]);
  });

  it("accumulates distance monotonically", () => {
    const route = optimiseRoute(MELBOURNE_CBD, [
      stop("a", -37.82, 144.97),
      stop("b", -37.85, 145.0),
      stop("c", -37.88, 145.05),
    ]);

    for (let i = 1; i < route.length; i++) {
      assert.ok(
        route[i]!.cumulativeKm >= route[i - 1]!.cumulativeKm,
        "cumulative distance must never decrease",
      );
    }
  });

  it("adds on-scene time between stops so later ETAs are realistic", () => {
    const route = optimiseRoute(
      MELBOURNE_CBD,
      [stop("a", -37.82, 144.97), stop("b", -37.83, 144.98)],
      { averageSpeedKmh: 30, minutesOnScene: 20 },
    );

    const gap = route[1]!.etaMinutes - route[0]!.etaMinutes;
    assert.ok(gap >= 20, `expected at least the 20 min consult, got ${gap}`);
  });

  it("handles an empty run", () => {
    const route = optimiseRoute(MELBOURNE_CBD, []);
    assert.deepEqual(route, []);
    assert.equal(totalKm(route), 0);
  });

  it("reports the total distance of the run", () => {
    const route = optimiseRoute(MELBOURNE_CBD, [
      stop("a", -37.82, 144.97),
      stop("b", -37.85, 145.0),
    ]);
    assert.equal(totalKm(route), route[route.length - 1]!.cumulativeKm);
  });
});
