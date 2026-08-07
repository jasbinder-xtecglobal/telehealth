import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessPrescription,
  checkAllergies,
  checkDuplicateTherapy,
  checkInteractions,
  isOverrideAcceptable,
  type DrugFacts,
} from "./safety.policy.ts";

const amoxicillin: DrugFacts = {
  productName: "Amoxil",
  activeIngredient: "Amoxicillin",
  contraindicatedWith: ["Penicillin", "Amoxicillin"],
  interactsWith: [],
  isMonitored: false,
};

const trimethoprim: DrugFacts = {
  productName: "Alprim",
  activeIngredient: "Trimethoprim",
  contraindicatedWith: ["Trimethoprim"],
  interactsWith: ["Nitrofurantoin"],
  isMonitored: false,
};

describe("allergy contraindication", () => {
  it("blocks a drug the patient is allergic to", () => {
    const result = checkAllergies(amoxicillin, [
      { substance: "Penicillin", reaction: "Rash", isNkda: false },
    ]);
    assert.equal(result.length, 1);
    assert.match(result[0]!, /Penicillin/);
    assert.match(result[0]!, /contraindicated/);
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    const result = checkAllergies(amoxicillin, [
      { substance: "  penicillin ", reaction: null, isNkda: false },
    ]);
    assert.equal(result.length, 1);
  });

  it("never treats an NKDA marker as a substance", () => {
    const result = checkAllergies(amoxicillin, [
      { substance: "NKDA", reaction: null, isNkda: true },
    ]);
    assert.deepEqual(result, []);
  });

  it("allows an unrelated drug", () => {
    const result = checkAllergies(trimethoprim, [
      { substance: "Penicillin", reaction: "Rash", isNkda: false },
    ]);
    assert.deepEqual(result, []);
  });
});

describe("interactions and duplicates", () => {
  it("flags an interacting medicine already prescribed", () => {
    const result = checkInteractions(trimethoprim, [
      { activeIngredient: "Nitrofurantoin" },
    ]);
    assert.equal(result.length, 1);
    assert.match(result[0]!, /Interaction/);
  });

  it("flags the same ingredient prescribed twice", () => {
    const result = checkDuplicateTherapy(trimethoprim, [
      { activeIngredient: "Trimethoprim" },
    ]);
    assert.equal(result.length, 1);
    assert.match(result[0]!, /Duplicate therapy/);
  });

  it("stays quiet when nothing conflicts", () => {
    assert.deepEqual(checkInteractions(trimethoprim, [{ activeIngredient: "Salbutamol" }]), []);
    assert.deepEqual(checkDuplicateTherapy(trimethoprim, [{ activeIngredient: "Salbutamol" }]), []);
  });
});

describe("full assessment", () => {
  it("separates hard stops from advisory warnings", () => {
    const result = assessPrescription({
      drug: trimethoprim,
      allergies: [{ substance: "Trimethoprim", reaction: "Angioedema", isNkda: false }],
      currentPrescriptions: [{ activeIngredient: "Nitrofurantoin" }],
      monitoringAlerts: ["Monitored medicine — register would be queried."],
    });

    assert.equal(result.blocking.length, 1);
    assert.equal(result.warnings.length, 2);
  });

  it("passes a clean prescription", () => {
    const result = assessPrescription({
      drug: amoxicillin,
      allergies: [{ substance: "NKDA", reaction: null, isNkda: true }],
      currentPrescriptions: [],
    });
    assert.deepEqual(result.blocking, []);
    assert.deepEqual(result.warnings, []);
  });
});

describe("override", () => {
  it("rejects an empty or token reason", () => {
    assert.equal(isOverrideAcceptable(null), false);
    assert.equal(isOverrideAcceptable(""), false);
    assert.equal(isOverrideAcceptable("ok"), false);
  });

  it("accepts a substantive reason", () => {
    assert.equal(
      isOverrideAcceptable("Allergy documented in error, confirmed with patient"),
      true,
    );
  });
});
