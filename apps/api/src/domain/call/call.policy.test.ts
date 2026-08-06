import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../errors.ts";
import {
  assertCallAllowed,
  consultCallBlocker,
  describeCallOptions,
  videoRequiresPatient,
  type CallableConsult,
  type ProviderCapability,
} from "./call.policy.ts";

const DOCTOR = "doc-1";

function consult(over: Partial<CallableConsult> = {}): CallableConsult {
  return {
    id: "consult-1",
    status: "in_consult",
    doctorId: DOCTOR,
    patientJoinedAt: new Date(2026, 7, 6, 21, 0),
    preference: "phone",
    ...over,
  };
}

function provider(over: Partial<ProviderCapability> = {}): ProviderCapability {
  return {
    id: "livekit",
    label: "LiveKit",
    configured: true,
    configHint: null,
    modes: ["audio", "video"],
    ...over,
  };
}

describe("consultCallBlocker", () => {
  it("allows the owning doctor on a claimed consult", () => {
    assert.equal(consultCallBlocker(consult({ status: "claimed" }), DOCTOR), null);
  });

  it("allows a call while attestation is outstanding", () => {
    const c = consult({ status: "pending_attestation" });
    assert.equal(consultCallBlocker(c, DOCTOR), null);
  });

  it("refuses a doctor who does not hold the consult", () => {
    assert.equal(
      consultCallBlocker(consult({ doctorId: "doc-2" }), DOCTOR),
      "This consult belongs to another doctor",
    );
  });

  it("refuses an unclaimed consult", () => {
    const c = consult({ status: "queued", doctorId: null });
    assert.equal(consultCallBlocker(c, DOCTOR), "This consult belongs to another doctor");
  });

  it("refuses a queued consult even when it is reserved for this doctor", () => {
    assert.equal(
      consultCallBlocker(consult({ status: "queued" }), DOCTOR),
      "Claim the consult before calling",
    );
  });

  it("names a closed consult specifically", () => {
    assert.equal(
      consultCallBlocker(consult({ status: "closed" }), DOCTOR),
      "This consult is closed",
    );
  });
});

describe("videoRequiresPatient", () => {
  it("is true for a phone booking until the patient follows the link", () => {
    assert.equal(videoRequiresPatient(consult({ patientJoinedAt: null })), true);
  });

  it("is false once they have joined", () => {
    assert.equal(videoRequiresPatient(consult()), false);
  });

  it("is false for a video booking even before they arrive", () => {
    // Otherwise the rule is circular: the link they would arrive through is
    // minted by the very call this would be blocking.
    const c = consult({ patientJoinedAt: null, preference: "video" });
    assert.equal(videoRequiresPatient(c), false);
  });
});

describe("describeCallOptions", () => {
  it("offers a configured provider for audio", () => {
    const [opt] = describeCallOptions({
      consult: consult(),
      doctorId: DOCTOR,
      mode: "audio",
      providers: [provider()],
    });

    assert.equal(opt!.available, true);
    assert.equal(opt!.unavailableReason, null);
  });

  it("lists an unconfigured provider rather than hiding it", () => {
    const [opt] = describeCallOptions({
      consult: consult(),
      doctorId: DOCTOR,
      mode: "audio",
      providers: [provider({ configured: false })],
    });

    assert.equal(opt!.id, "livekit");
    assert.equal(opt!.available, false);
    assert.equal(opt!.unavailableReason, "LiveKit is not configured yet");
  });

  it("offers video on a video booking before the patient arrives", () => {
    const [opt] = describeCallOptions({
      consult: consult({ patientJoinedAt: null, preference: "video" }),
      doctorId: DOCTOR,
      mode: "video",
      providers: [provider()],
    });

    assert.equal(opt!.available, true);
  });

  it("blocks video until the patient joins, but not audio", () => {
    const waiting = consult({ patientJoinedAt: null });

    const [video] = describeCallOptions({
      consult: waiting,
      doctorId: DOCTOR,
      mode: "video",
      providers: [provider()],
    });
    const [audio] = describeCallOptions({
      consult: waiting,
      doctorId: DOCTOR,
      mode: "audio",
      providers: [provider()],
    });

    assert.equal(video!.available, false);
    assert.equal(
      video!.unavailableReason,
      "The patient must join before video is available",
    );
    assert.equal(audio!.available, true);
  });

  it("refuses a mode the adapter does not implement", () => {
    const [opt] = describeCallOptions({
      consult: consult(),
      doctorId: DOCTOR,
      mode: "video",
      providers: [provider({ label: "Twilio", modes: ["audio"] })],
    });

    assert.equal(opt!.unavailableReason, "Twilio does not support video in this build");
  });

  it("reports the consult blocker ahead of any vendor problem", () => {
    const [opt] = describeCallOptions({
      consult: consult({ status: "closed" }),
      doctorId: DOCTOR,
      mode: "audio",
      providers: [provider({ configured: false })],
    });

    assert.equal(opt!.unavailableReason, "This consult is closed");
  });

  it("describes every installed provider, in order", () => {
    const opts = describeCallOptions({
      consult: consult(),
      doctorId: DOCTOR,
      mode: "audio",
      providers: [
        provider(),
        provider({ id: "twilio", label: "Twilio", configured: false }),
      ],
    });

    assert.deepEqual(
      opts.map((o) => [o.id, o.available]),
      [
        ["livekit", true],
        ["twilio", false],
      ],
    );
  });
});

describe("assertCallAllowed", () => {
  const call = (over: {
    consult?: CallableConsult;
    provider?: ProviderCapability | undefined;
    mode?: "audio" | "video";
  }) =>
    assertCallAllowed({
      consult: over.consult ?? consult(),
      doctorId: DOCTOR,
      mode: over.mode ?? "audio",
      provider: "provider" in over ? over.provider : provider(),
    });

  it("passes when the option is available", () => {
    assert.doesNotThrow(() => call({}));
  });

  it("is FORBIDDEN when another doctor holds the consult", () => {
    assert.throws(
      () => call({ consult: consult({ doctorId: "doc-2" }) }),
      (e: DomainError) => e instanceof DomainError && e.code === "FORBIDDEN",
    );
  });

  it("is PRECONDITION_FAILED when the consult is not claimed", () => {
    assert.throws(
      () => call({ consult: consult({ status: "queued" }) }),
      (e: DomainError) => e instanceof DomainError && e.code === "PRECONDITION_FAILED",
    );
  });

  it("is NOT_FOUND when the provider is not installed", () => {
    assert.throws(
      () => call({ provider: undefined }),
      (e: DomainError) => e instanceof DomainError && e.code === "NOT_FOUND",
    );
  });

  it("refuses video before the patient joins", () => {
    assert.throws(
      () => call({ consult: consult({ patientJoinedAt: null }), mode: "video" }),
      (e: DomainError) => e.message === "The patient must join before video is available",
    );
  });

  it("refuses an unconfigured provider", () => {
    assert.throws(
      () => call({ provider: provider({ configured: false }) }),
      (e: DomainError) => e.message === "LiveKit is not configured yet",
    );
  });
});
