/**
 * Waiting-room rules: visibility, ordering and family grouping.
 *
 * Pure transformations over rows already fetched by the repository, so the
 * ordering and filtering behaviour can be tested without a database.
 */
import type { SymptomCategory } from "../../db/schema/enums.ts";

export type QueueCandidate = {
  id: string;
  patientId: string;
  symptomCategory: SymptomCategory;
  acuity: number;
  requestedAt: Date;
  privateToDoctorId: string | null;
  preference: "phone" | "video";
  additionalInfo: string | null;
  patient: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: string | null;
    state: string | null;
    concessionCard: boolean;
    familyGroupId: string | null;
  };
};

export type QueueEntry = {
  consultId: string;
  patientId: string;
  name: string;
  age: number;
  gender: string | null;
  state: string | null;
  category: SymptomCategory;
  additionalInfo: string | null;
  preference: "phone" | "video";
  concessionCard: boolean;
  acuity: number;
  requestedAt: Date;
  isPrivate: boolean;
  familyMembers: { consultId: string; name: string; age: number }[];
};

export type Visibility = {
  doctorId: string;
  excludedCategories: readonly SymptomCategory[];
  hiddenPatientIds: readonly string[];
};

export function ageFromDob(dob: string, now = new Date()): number {
  const d = new Date(dob);
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/**
 * A consult is visible to a doctor unless they have filtered its category,
 * hidden the patient, or it is private to someone else.
 */
export function isVisibleTo(c: QueueCandidate, v: Visibility): boolean {
  if (c.privateToDoctorId && c.privateToDoctorId !== v.doctorId) return false;
  if (v.excludedCategories.includes(c.symptomCategory)) return false;
  if (v.hiddenPatientIds.includes(c.patientId)) return false;
  return true;
}

/**
 * Acuity first, then wait time.
 *
 * Deliberately not pure FIFO: a febrile child must not sit behind adults who
 * happen to have waited longer.
 */
export function compareByPriority(a: QueueCandidate, b: QueueCandidate): number {
  if (a.acuity !== b.acuity) return a.acuity - b.acuity;
  return a.requestedAt.getTime() - b.requestedAt.getTime();
}

/**
 * Collapse family groups into a single entry so claiming one member takes the
 * whole household.
 */
export function buildQueue(
  candidates: readonly QueueCandidate[],
  visibility: Visibility,
  now = new Date(),
): QueueEntry[] {
  const visible = candidates
    .filter((c) => isVisibleTo(c, visibility))
    .slice()
    .sort(compareByPriority);

  const seenGroups = new Set<string>();
  const entries: QueueEntry[] = [];

  for (const c of visible) {
    const groupId = c.patient.familyGroupId;
    if (groupId) {
      if (seenGroups.has(groupId)) continue;
      seenGroups.add(groupId);
    }

    const familyMembers = groupId
      ? visible
          .filter((o) => o.patient.familyGroupId === groupId && o.id !== c.id)
          .map((o) => ({
            consultId: o.id,
            name: `${o.patient.firstName} ${o.patient.lastName}`,
            age: ageFromDob(o.patient.dob, now),
          }))
      : [];

    entries.push({
      consultId: c.id,
      patientId: c.patientId,
      name: `${c.patient.firstName} ${c.patient.lastName}`,
      age: ageFromDob(c.patient.dob, now),
      gender: c.patient.gender,
      state: c.patient.state,
      category: c.symptomCategory,
      additionalInfo: c.additionalInfo,
      preference: c.preference,
      concessionCard: c.patient.concessionCard,
      acuity: c.acuity,
      requestedAt: c.requestedAt,
      isPrivate: c.privateToDoctorId === visibility.doctorId,
      familyMembers,
    });
  }

  return entries;
}
