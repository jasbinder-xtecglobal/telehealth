import type { PrescriptionMonitoringPort } from "../ports.ts";

/**
 * Stand-in for real-time prescription monitoring.
 *
 * In production this is a per-state integration — SafeScript in Victoria and
 * NSW, QScript in Queensland, ScriptCheckSA in South Australia — and it is
 * legally mandated for monitored medicines, not optional.
 */
export class MockPrescriptionMonitoringAdapter implements PrescriptionMonitoringPort {
  async check(input: { isMonitored: boolean; patientName: string }) {
    if (!input.isMonitored) return { checked: false, alerts: [] };

    return {
      checked: true,
      alerts: [
        `Monitored medicine. The state register would be queried for ${input.patientName} before this script is issued.`,
      ],
    };
  }
}
