import { z } from "zod";
import { BOOKING_REASON_VALUES } from "../domain/intake/intake.policy.ts";
import { doctorProcedure, intakeProcedure, router } from "../trpc.ts";
import { uuid } from "./schemas.ts";

const auState = z.enum(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const bookingInput = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  dob: isoDate,
  gender: z.string().max(40).optional(),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  addressLine: z.string().trim().max(200).optional(),
  suburb: z.string().trim().max(80).optional(),
  state: auState.optional(),
  postcode: z.string().trim().max(10).optional(),
  medicareNumber: z.string().trim().max(20).optional(),
  preferredContact: z.enum(["phone", "email", "sms"]).default("phone"),

  reason: z.enum(BOOKING_REASON_VALUES),
  symptoms: z.string().trim().min(3).max(4000),
  symptomsStartedOn: isoDate.optional().or(z.literal("")),
  painLevel: z.number().int().min(1).max(10).optional(),
  reportedMedications: z.string().trim().max(1000).optional(),
  reportedAllergies: z.string().trim().max(1000).optional(),
  reportedConditions: z.string().trim().max(1000).optional(),

  preference: z.enum(["phone", "video"]),
  preferredDoctor: z.string().max(60).optional(),
  preferredTime: z.string().max(60).optional(),

  emergencyCleared: z.boolean(),
});

const applicationInput = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(30),
  ahpraNumber: z.string().trim().min(3).max(40),
  yearsExperience: z.string().trim().min(1).max(40),
  specialty: z.string().trim().min(1).max(80),
  employment: z.enum(["part_time", "full_time"]),
  coverLetter: z.string().trim().max(4000).optional(),
});

/**
 * Public intake transport.
 *
 * The first two procedures are reachable without a session; see the note on
 * `intakeProcedure`. The last two are the operator's side and require one.
 */
export const intakeRouter = router({
  bookConsultation: intakeProcedure
    .input(bookingInput)
    .mutation(({ ctx, input }) =>
      ctx.services.intake.bookConsultation({
        ...input,
        email: input.email || undefined,
        symptomsStartedOn: input.symptomsStartedOn || undefined,
      }),
    ),

  applyAsDoctor: intakeProcedure
    .input(applicationInput)
    .mutation(({ ctx, input }) => ctx.services.intake.applyAsDoctor(input)),

  /* ---------------- operator ---------------- */
  applications: doctorProcedure.query(({ ctx }) =>
    ctx.services.intake.listApplications(),
  ),

  reviewApplication: doctorProcedure
    .input(
      z.object({
        id: uuid,
        status: z.enum(["submitted", "reviewing", "accepted", "declined"]),
        note: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.services.intake.reviewApplication(ctx.doctor, input),
    ),
});
