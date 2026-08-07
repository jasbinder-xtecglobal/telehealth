import { z } from "zod";
import { BOOKING_REASON_VALUES } from "../domain/intake/intake.policy.ts";
import { doctorProcedure, router } from "../trpc.ts";
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
 * Intake transport.
 *
 * Every procedure here requires a session. The public website that used to
 * reach the first two without one has moved to its own repository; until it
 * returns, an operator creates bookings and applications by hand from the
 * workstation, which is why these now sit on `doctorProcedure`.
 *
 * When the website comes back it needs a deliberately reintroduced public door
 * — write-only, rate limited, unable to create an account, a session, a
 * clinical artefact or a billing record. Do not simply widen these.
 */
export const intakeRouter = router({
  bookingReasons: doctorProcedure.query(({ ctx }) =>
    ctx.services.intake.bookingReasons(),
  ),

  bookConsultation: doctorProcedure
    .input(bookingInput)
    .mutation(({ ctx, input }) =>
      ctx.services.intake.bookConsultation({
        ...input,
        email: input.email || undefined,
        symptomsStartedOn: input.symptomsStartedOn || undefined,
      }),
    ),

  applyAsDoctor: doctorProcedure
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
