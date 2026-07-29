/**
 * Composition root.
 *
 * The only file that knows which concrete implementation satisfies which port.
 * Everything above this line depends on interfaces, so swapping the mock eScript
 * adapter for a real one, or the in-memory bus for Redis, is a change here and
 * nowhere else.
 *
 * Wiring order is bottom-up: infrastructure, then repositories, then services.
 */
import { env } from "./config/env.ts";
import { db, type Database } from "./db/client.ts";
import {
  DrizzleTransactionRunner,
  type TransactionRunner,
} from "./db/transaction-runner.ts";

import { CryptoTokenAdapter } from "./integrations/auth/crypto-token.adapter.ts";
import { ScryptPasswordHasher } from "./integrations/auth/scrypt-hasher.adapter.ts";
import { MockClaimingAdapter } from "./integrations/claiming/mock-claiming.adapter.ts";
import { MockEmailAdapter } from "./integrations/email/mock-email.adapter.ts";
import { MockEscriptAdapter } from "./integrations/escript/mock-escript.adapter.ts";
import { InMemoryEventBus } from "./integrations/events/in-memory-bus.adapter.ts";
import { MockPrescriptionMonitoringAdapter } from "./integrations/monitoring/mock-monitoring.adapter.ts";
import { HaversineRoutingAdapter } from "./integrations/routing/haversine-routing.adapter.ts";
import { MockScribeAdapter } from "./integrations/scribe/mock-scribe.adapter.ts";
import { MockSummariserAdapter } from "./integrations/scribe/mock-summariser.adapter.ts";
import { MockSmsAdapter } from "./integrations/sms/mock-sms.adapter.ts";
import { SystemClock } from "./integrations/system-clock.adapter.ts";
import type {
  ClaimingPort,
  ClockPort,
  EscriptPort,
  EventBusPort,
  EmailPort,
  PasswordHasherPort,
  PrescriptionMonitoringPort,
  RoutingPort,
  TokenPort,
  ScribePort,
  SmsPort,
  SummariserPort,
} from "./integrations/ports.ts";

import {
  DrizzleArtefactRepository,
  DrizzleAuditRepository,
  DrizzleAuthRepository,
  DrizzleBillingRepository,
  DrizzleChatRepository,
  DrizzleConsultRepository,
  DrizzleDispatchRepository,
  DrizzleDoctorRepository,
  DrizzlePatientRepository,
  DrizzleReferenceRepository,
} from "./repositories/index.ts";
import type {
  ArtefactRepository,
  AuditRepository,
  AuthRepository,
  BillingRepository,
  ChatRepository,
  ConsultRepository,
  DispatchRepository,
  DoctorRepository,
  PatientRepository,
  ReferenceRepository,
} from "./repositories/ports.ts";

import { AuthService } from "./services/auth.service.ts";
import { BillingService } from "./services/billing.service.ts";
import { ChatService } from "./services/chat.service.ts";
import { ConsultService } from "./services/consult.service.ts";
import { DispatchService } from "./services/dispatch.service.ts";
import { DoctorService } from "./services/doctor.service.ts";
import { PrescribingService } from "./services/prescribing.service.ts";
import { QueueService } from "./services/queue.service.ts";
import { ReferenceService } from "./services/reference.service.ts";
import { ScribeService } from "./services/scribe.service.ts";

export type Ports = {
  clock: ClockPort;
  escript: EscriptPort;
  sms: SmsPort;
  claiming: ClaimingPort;
  monitoring: PrescriptionMonitoringPort;
  scribe: ScribePort;
  summariser: SummariserPort;
  routing: RoutingPort;
  hasher: PasswordHasherPort;
  tokens: TokenPort;
  email: EmailPort;
  events: EventBusPort;
};

export type Repositories = {
  consults: ConsultRepository;
  patients: PatientRepository;
  doctors: DoctorRepository;
  artefacts: ArtefactRepository;
  billings: BillingRepository;
  reference: ReferenceRepository;
  chat: ChatRepository;
  audit: AuditRepository;
  dispatch: DispatchRepository;
  auth: AuthRepository;
};

export type Services = {
  queue: QueueService;
  consult: ConsultService;
  prescribing: PrescribingService;
  billing: BillingService;
  scribe: ScribeService;
  doctor: DoctorService;
  chat: ChatService;
  reference: ReferenceService;
  dispatch: DispatchService;
  auth: AuthService;
};

export type Container = {
  db: Database;
  tx: TransactionRunner;
  ports: Ports;
  repositories: Repositories;
  services: Services;
};

/**
 * Builds the object graph.
 *
 * Overrides exist so a test can substitute a fake clock, an in-memory
 * repository, or a recording SMS adapter without touching production wiring.
 */
export function createContainer(
  overrides: {
    db?: Database;
    ports?: Partial<Ports>;
    repositories?: Partial<Repositories>;
    tx?: TransactionRunner;
  } = {},
): Container {
  const database = overrides.db ?? db;
  const tx = overrides.tx ?? new DrizzleTransactionRunner(database);

  /* ---------------- infrastructure ---------------- */
  const clock = overrides.ports?.clock ?? new SystemClock();

  const ports: Ports = {
    clock,
    escript: overrides.ports?.escript ?? new MockEscriptAdapter(),
    sms: overrides.ports?.sms ?? new MockSmsAdapter(clock),
    claiming: overrides.ports?.claiming ?? new MockClaimingAdapter(),
    monitoring:
      overrides.ports?.monitoring ?? new MockPrescriptionMonitoringAdapter(),
    scribe: overrides.ports?.scribe ?? new MockScribeAdapter(clock),
    summariser: overrides.ports?.summariser ?? new MockSummariserAdapter(),
    routing: overrides.ports?.routing ?? new HaversineRoutingAdapter(),
    hasher: overrides.ports?.hasher ?? new ScryptPasswordHasher(),
    tokens: overrides.ports?.tokens ?? new CryptoTokenAdapter(),
    email: overrides.ports?.email ?? new MockEmailAdapter(clock),
    events: overrides.ports?.events ?? new InMemoryEventBus(),
  };

  /* ---------------- repositories ---------------- */
  const repositories: Repositories = {
    consults: overrides.repositories?.consults ?? new DrizzleConsultRepository(database),
    patients: overrides.repositories?.patients ?? new DrizzlePatientRepository(database),
    doctors: overrides.repositories?.doctors ?? new DrizzleDoctorRepository(database),
    artefacts:
      overrides.repositories?.artefacts ?? new DrizzleArtefactRepository(database),
    billings: overrides.repositories?.billings ?? new DrizzleBillingRepository(database),
    reference:
      overrides.repositories?.reference ?? new DrizzleReferenceRepository(database),
    chat: overrides.repositories?.chat ?? new DrizzleChatRepository(database),
    audit: overrides.repositories?.audit ?? new DrizzleAuditRepository(database),
    dispatch:
      overrides.repositories?.dispatch ?? new DrizzleDispatchRepository(database),
    auth: overrides.repositories?.auth ?? new DrizzleAuthRepository(database),
  };

  /* ---------------- services ---------------- */
  const scribe = new ScribeService(
    repositories.consults,
    repositories.doctors,
    ports.scribe,
    ports.summariser,
    repositories.audit,
  );

  const services: Services = {
    scribe,
    queue: new QueueService(repositories.consults, repositories.doctors, ports.clock),
    consult: new ConsultService(
      repositories.consults,
      repositories.patients,
      repositories.artefacts,
      repositories.billings,
      repositories.audit,
      scribe,
      ports.escript,
      ports.sms,
      ports.events,
      ports.clock,
      tx,
    ),
    prescribing: new PrescribingService(
      repositories.consults,
      repositories.patients,
      repositories.artefacts,
      repositories.reference,
      ports.monitoring,
      repositories.audit,
    ),
    billing: new BillingService(
      repositories.consults,
      repositories.billings,
      repositories.reference,
      ports.clock,
    ),
    doctor: new DoctorService(
      repositories.doctors,
      repositories.artefacts,
      repositories.audit,
      ports.sms,
      ports.events,
      ports.clock,
    ),
    chat: new ChatService(repositories.chat, ports.events),
    reference: new ReferenceService(repositories.reference),
    auth: new AuthService(
      repositories.auth,
      repositories.doctors,
      ports.hasher,
      ports.tokens,
      ports.email,
      repositories.audit,
      ports.clock,
      env.WEB_ORIGIN,
    ),
    dispatch: new DispatchService(
      repositories.dispatch,
      repositories.consults,
      repositories.doctors,
      ports.routing,
      ports.sms,
      ports.events,
      repositories.audit,
      ports.clock,
    ),
  };

  return { db: database, tx, ports, repositories, services };
}

/** Process-wide instance used by the HTTP layer. */
export const container = createContainer();
