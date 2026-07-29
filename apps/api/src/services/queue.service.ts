import type { ConsultChannel } from "../db/schema/enums.ts";
import type { Doctor } from "../db/schema/doctors.ts";
import { buildQueue, type QueueEntry } from "../domain/queue/queue.policy.ts";
import type { ClockPort } from "../integrations/ports.ts";
import type { ConsultRepository, DoctorRepository } from "../repositories/ports.ts";

/**
 * Waiting-room use cases.
 *
 * Fetches through repositories, then hands the rows to the queue policy for
 * visibility, ordering and family grouping. No SQL, no ordering rules here —
 * this class only orchestrates.
 */
export class QueueService {
  constructor(
    private readonly consults: ConsultRepository,
    private readonly doctors: DoctorRepository,
    private readonly clock: ClockPort,
  ) {}

  async listFor(doctor: Doctor, channel: ConsultChannel): Promise<QueueEntry[]> {
    const [candidates, excludedCategories, hidden] = await Promise.all([
      this.consults.listQueued(channel),
      this.doctors.listFilters(doctor.id),
      this.doctors.listHiddenPatients(doctor.id),
    ]);

    return buildQueue(
      candidates,
      {
        doctorId: doctor.id,
        excludedCategories,
        hiddenPatientIds: hidden.map((h) => h.patientId),
      },
      this.clock.now(),
    );
  }

  /** Header counters: today's and this week's billings, patients seen, queue depth. */
  async statsFor(doctor: Doctor) {
    const all = await this.consults.listAllWithBillings();

    const startOfDay = new Date(this.clock.now());
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

    let billedToday = 0;
    let billedWeek = 0;
    let seenToday = 0;
    let businessToday = 0;
    let queued = 0;

    for (const c of all) {
      if (c.status === "queued" || c.status === "requeued") queued++;
      if (!c.endedAt) continue;

      const isMine = c.doctorId === doctor.id;
      if (c.endedAt >= startOfDay) {
        businessToday++;
        if (isMine) seenToday++;
      }
      if (!isMine) continue;

      const fee = c.billings.reduce((sum, b) => sum + Number(b.fee ?? 0), 0);
      if (c.endedAt >= startOfDay) billedToday += fee;
      if (c.endedAt >= startOfWeek) billedWeek += fee;
    }

    return { billedToday, billedWeek, seenToday, businessToday, queued };
  }
}
