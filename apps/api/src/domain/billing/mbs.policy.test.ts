import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  requiresNoBillingReason,
  selectableItems,
  validateItem,
  type MbsItemFacts,
} from "./mbs.policy.ts";

const vrStandard: MbsItemFacts = {
  itemNumber: "5020",
  appliesTo: ["gp_fellow", "vr"],
  channel: "telehealth",
  minMinutes: 5,
  maxMinutes: 25,
};

const nonVrBrief: MbsItemFacts = {
  itemNumber: "5003",
  appliesTo: ["non_vr", "registrar"],
  channel: "telehealth",
  minMinutes: 0,
  maxMinutes: 5,
};

const homeVisit: MbsItemFacts = {
  itemNumber: "597",
  appliesTo: ["gp_fellow", "vr", "non_vr"],
  channel: "home_visit",
  minMinutes: 0,
  maxMinutes: null,
};

describe("item selection", () => {
  it("offers a VR doctor only items their registration allows", () => {
    const items = selectableItems([vrStandard, nonVrBrief, homeVisit], "vr", "telehealth");
    assert.deepEqual(items.map((i) => i.itemNumber), ["5020"]);
  });

  it("offers a non-VR doctor a different set", () => {
    const items = selectableItems([vrStandard, nonVrBrief], "non_vr", "telehealth");
    assert.deepEqual(items.map((i) => i.itemNumber), ["5003"]);
  });

  it("filters by consult channel", () => {
    const items = selectableItems([vrStandard, homeVisit], "vr", "home_visit");
    assert.deepEqual(items.map((i) => i.itemNumber), ["597"]);
  });
});

describe("validation", () => {
  it("accepts an item within its duration band", () => {
    const r = validateItem({
      item: vrStandard,
      doctorType: "vr",
      consultChannel: "telehealth",
      durationMinutes: 14,
    });
    assert.equal(r.valid, true);
    assert.deepEqual(r.errors, []);
  });

  it("rejects a consult shorter than the item's minimum", () => {
    const r = validateItem({
      item: vrStandard,
      doctorType: "vr",
      consultChannel: "telehealth",
      durationMinutes: 3,
    });
    assert.equal(r.valid, false);
    assert.match(r.errors[0]!, /at least 5 min/);
  });

  it("rejects a consult beyond the item's cap", () => {
    const r = validateItem({
      item: vrStandard,
      doctorType: "vr",
      consultChannel: "telehealth",
      durationMinutes: 40,
    });
    assert.match(r.errors[0]!, /capped at 25 min/);
  });

  it("rejects an item the registration type cannot claim", () => {
    const r = validateItem({
      item: vrStandard,
      doctorType: "non_vr",
      consultChannel: "telehealth",
      durationMinutes: 14,
    });
    assert.match(r.errors[0]!, /not claimable/);
  });

  it("rejects an item used on the wrong channel", () => {
    const r = validateItem({
      item: vrStandard,
      doctorType: "vr",
      consultChannel: "home_visit",
      durationMinutes: 14,
    });
    assert.match(r.errors.join(" "), /does not apply to home visit/);
  });
});

describe("no-billing", () => {
  it("requires a reason when no item is selected", () => {
    assert.equal(requiresNoBillingReason(null), true);
    assert.equal(requiresNoBillingReason("5020"), false);
  });
});
