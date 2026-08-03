/**
 * Seed data for the prototype.
 *
 * Reproduces the demo queue from the reference walkthrough so the prototype is
 * immediately recognisable. All identifiers — provider numbers, prescriber
 * numbers, Medicare numbers, phone numbers and addresses — are synthetic.
 */
import { randomUUID } from "node:crypto";
import { ScryptPasswordHasher } from "../integrations/auth/scrypt-hasher.adapter.ts";
import { closeDatabase, db, schema } from "./client.ts";

/**
 * Shared password for every seeded doctor.
 * Synthetic accounts on a synthetic dataset — never reuse this anywhere real.
 */
const DEMO_PASSWORD = "Nightshift2026Rounds";

const {
  auditEvents,
  billings,
  chatMessages,
  consultIntake,
  consults,
  consultTranscripts,
  doctorApplications,
  doctorFilters,
  doctors,
  documents,
  drugs,
  duressAlerts,
  hiddenPatients,
  investigations,
  mbsItems,
  noteRevisions,
  patientAllergies,
  patients,
  prescriptions,
  referrals,
  templates,
  visits,
} = schema;

const minsAgo = (m: number) => new Date(Date.now() - m * 60_000);
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

async function main() {
  console.log("clearing existing data…");
  // Order matters — children first. Dispatch tables are cleared explicitly
  // rather than relying on cascade, so a reseed is correct even if a
  // constraint failed to apply.
  await db.delete(duressAlerts);
  await db.delete(visits);
  await db.delete(auditEvents);
  await db.delete(noteRevisions);
  await db.delete(consultTranscripts);
  await db.delete(consultIntake);
  await db.delete(doctorApplications);
  await db.delete(prescriptions);
  await db.delete(referrals);
  await db.delete(investigations);
  await db.delete(documents);
  await db.delete(billings);
  await db.delete(consults);
  await db.delete(patientAllergies);
  await db.delete(hiddenPatients);
  await db.delete(patients);
  await db.delete(templates);
  await db.delete(doctorFilters);
  await db.delete(chatMessages);
  await db.delete(doctors);
  await db.delete(drugs);
  await db.delete(mbsItems);

  /* ---------------------------------------------------------------- *
   * Doctors
   * ---------------------------------------------------------------- */
  console.log("seeding doctors…");
  const demoHash = await new ScryptPasswordHasher().hash(DEMO_PASSWORD);
  const verifiedNow = new Date();

  const doctorRows = await db
    .insert(doctors)
    .values(
      ([
      {
        email: "david.szekely@example.test",
        firstName: "David",
        lastName: "Szekely",
        chosenName: "David",
        mobile: "0400000001",
        gender: "Male",
        providerNumber: "9900001A",
        prescriberNumber: "9900001",
        doctorType: "gp_fellow",
        qualifications: "MBBS, FRACGP",
        aiScribePersonalisation:
          "Be brief and use sentence fragments where appropriate.\nPC = presenting complaint\nHPC =\nPMH =",
        prefTelehealth: true,
        prefHomeVisits: true,
        isOnline: true,
        lastSeenAt: new Date(),
        // Parked in Carlton at the start of the shift.
        latitude: "-37.800000",
        longitude: "144.967000",
        locationUpdatedAt: new Date(),
      },
      {
        email: "bowen.zhao@example.test",
        firstName: "Bowen",
        lastName: "Zhao",
        mobile: "0400000002",
        gender: "Male",
        providerNumber: "9900002B",
        prescriberNumber: "9900002",
        doctorType: "vr",
        qualifications: "MBBS, FRACGP",
        prefHomeVisits: true,
        isOnline: true,
        lastSeenAt: minsAgo(3),
        latitude: "-37.840000",
        longitude: "145.000000",
        locationUpdatedAt: minsAgo(3),
      },
      {
        email: "carter.snowden@example.test",
        firstName: "Carter",
        lastName: "Snowden",
        mobile: "0400000003",
        gender: "Male",
        providerNumber: "9900003C",
        prescriberNumber: "9900003",
        doctorType: "non_vr",
        qualifications: "MBBS",
        isOnline: false,
        lastSeenAt: minsAgo(45),
      },
      {
        email: "jonathan.brown@example.test",
        firstName: "Jonathan",
        lastName: "Brown",
        mobile: "0400000004",
        gender: "Male",
        providerNumber: "9900004D",
        prescriberNumber: "9900004",
        doctorType: "gp_fellow",
        qualifications: "MBBS, FRACGP",
        isOnline: false,
        lastSeenAt: daysAgo(1),
      },
      // Seeded accounts are pre-verified so the demo queue is usable
      // immediately; a real signup goes through the email link.
      ] satisfies schema.NewDoctor[]).map((d) => ({
        ...d,
        passwordHash: demoHash,
        status: "active" as const,
        emailVerifiedAt: verifiedNow,
      })),
    )
    .returning();

  const david = doctorRows[0]!;
  const bowen = doctorRows[1]!;
  const carter = doctorRows[2]!;
  const drJonathan = doctorRows[3]!;

  /* ---------------------------------------------------------------- *
   * Templates
   * ---------------------------------------------------------------- */
  console.log("seeding templates…");
  await db.insert(templates).values([
    {
      doctorId: david.id,
      name: "My default template",
      isDefault: true,
      sortOrder: 0,
      body: [
        "Dr David Szekely",
        "3 points of ID checked",
        "Date of call:",
        "Time:",
        "",
        "PC -",
        "",
        "HPC -",
        "",
        "PMH -",
        "",
        "DH -",
        "",
        "SH -",
        "",
        "Examination -",
        "",
        "Impression -",
        "",
        "Plan -",
      ].join("\n"),
    },
    {
      doctorId: david.id,
      name: "Fall template",
      isDefault: false,
      sortOrder: 1,
      body: [
        "Dr David Szekely",
        "3 points of ID checked",
        "",
        "Mechanism of fall -",
        "Head strike -",
        "LOC -",
        "Anticoagulated -",
        "Injuries -",
        "Mobility post fall -",
        "Observations -",
        "",
        "Impression -",
        "",
        "Plan -",
      ].join("\n"),
    },
  ]);

  /* ---------------------------------------------------------------- *
   * Mock MIMS
   * ---------------------------------------------------------------- */
  console.log("seeding drug reference…");
  await db.insert(drugs).values([
    {
      activeIngredient: "Amoxicillin",
      productName: "Amoxil",
      strength: "500 mg",
      form: "Capsule",
      defaultPackSize: 20,
      suggestedDose: "500 mg three times daily for 5 days",
      pbsCode: "2238W",
      contraindicatedWith: ["Penicillin", "Amoxicillin"],
    },
    {
      activeIngredient: "Phenoxymethylpenicillin",
      productName: "Cilicaine VK",
      strength: "500 mg",
      form: "Capsule",
      defaultPackSize: 25,
      suggestedDose: "500 mg four times daily for 10 days",
      pbsCode: "2213D",
      contraindicatedWith: ["Penicillin", "Phenoxymethylpenicillin"],
    },
    {
      activeIngredient: "Cefalexin",
      productName: "Keflex",
      strength: "500 mg",
      form: "Capsule",
      defaultPackSize: 20,
      suggestedDose: "500 mg twice daily for 5 days",
      pbsCode: "2437B",
      contraindicatedWith: ["Cefalexin"],
    },
    {
      activeIngredient: "Nitrofurantoin",
      productName: "Macrodantin",
      strength: "100 mg",
      form: "Capsule",
      defaultPackSize: 20,
      suggestedDose: "100 mg twice daily for 5 days",
      pbsCode: "1416C",
      contraindicatedWith: ["Nitrofurantoin"],
    },
    {
      activeIngredient: "Trimethoprim",
      productName: "Alprim",
      strength: "300 mg",
      form: "Tablet",
      defaultPackSize: 7,
      suggestedDose: "300 mg at night for 3 days",
      pbsCode: "1512K",
      contraindicatedWith: ["Trimethoprim"],
      interactsWith: ["Nitrofurantoin"],
    },
    {
      activeIngredient: "Salbutamol",
      productName: "Ventolin",
      strength: "100 mcg/dose",
      form: "Inhaler",
      defaultPackSize: 1,
      suggestedDose: "1–2 puffs as needed",
      pbsCode: "1080J",
    },
    {
      activeIngredient: "Ondansetron",
      productName: "Zofran",
      strength: "4 mg",
      form: "Wafer",
      defaultPackSize: 10,
      suggestedDose: "4 mg up to three times daily as needed",
      pbsCode: "8367Y",
    },
    {
      activeIngredient: "Molnupiravir",
      productName: "Lagevrio",
      strength: "200 mg",
      form: "Capsule",
      defaultPackSize: 40,
      suggestedDose: "800 mg twice daily for 5 days",
      pbsCode: "12991N",
      isStreamlined: true,
      streamlineCode: "14340",
      restrictionCriteria:
        "Patient must be 70 years of age or older, OR 50 years or older with two additional risk factors. Requires a positive PCR or RAT result and treatment commenced within 5 days of symptom onset.",
    },
    {
      activeIngredient: "Nirmatrelvir with ritonavir",
      productName: "Paxlovid",
      strength: "150 mg / 100 mg",
      form: "Tablet",
      defaultPackSize: 30,
      suggestedDose: "Two 150 mg tablets with one 100 mg tablet twice daily for 5 days",
      pbsCode: "12912K",
      isStreamlined: true,
      streamlineCode: "14341",
      restrictionCriteria:
        "Patient must be 70 years of age or older, OR 50 years or older with two additional risk factors. Check for interactions with existing therapy before prescribing.",
      interactsWith: ["Simvastatin", "Amiodarone"],
    },
    {
      activeIngredient: "Oxycodone",
      productName: "Endone",
      strength: "5 mg",
      form: "Tablet",
      defaultPackSize: 20,
      suggestedDose: "5 mg every 4–6 hours as needed",
      pbsCode: "2622D",
      isMonitored: true,
    },
    {
      activeIngredient: "Diazepam",
      productName: "Valium",
      strength: "5 mg",
      form: "Tablet",
      defaultPackSize: 50,
      suggestedDose: "5 mg at night as needed",
      pbsCode: "1201B",
      isMonitored: true,
    },
    {
      activeIngredient: "Prednisolone",
      productName: "Panafcortelone",
      strength: "25 mg",
      form: "Tablet",
      defaultPackSize: 30,
      suggestedDose: "25 mg daily for 5 days",
      pbsCode: "2266L",
    },
    {
      activeIngredient: "Cetirizine",
      productName: "Zyrtec",
      strength: "10 mg",
      form: "Tablet",
      defaultPackSize: 30,
      suggestedDose: "10 mg daily",
      pbsCode: "8253K",
    },
    {
      activeIngredient: "Chloramphenicol",
      productName: "Chlorsig",
      strength: "0.5%",
      form: "Eye drops",
      defaultPackSize: 1,
      suggestedDose: "1 drop every 2 hours for 2 days, then 4 times daily",
      pbsCode: "1638Q",
    },
  ]);

  /* ---------------------------------------------------------------- *
   * MBS items
   * ---------------------------------------------------------------- */
  console.log("seeding MBS items…");
  await db.insert(mbsItems).values([
    {
      itemNumber: "5000",
      description: "After-hours attendance, VR GP — brief",
      fee: "45.75",
      appliesTo: ["gp_fellow", "vr"],
      channel: "telehealth",
      minMinutes: 0,
      maxMinutes: 5,
    },
    {
      itemNumber: "5020",
      description: "After-hours attendance, VR GP — standard",
      fee: "78.40",
      appliesTo: ["gp_fellow", "vr"],
      channel: "telehealth",
      minMinutes: 5,
      maxMinutes: 25,
    },
    {
      itemNumber: "5040",
      description: "After-hours attendance, VR GP — long",
      fee: "114.20",
      appliesTo: ["gp_fellow", "vr"],
      channel: "telehealth",
      minMinutes: 25,
      maxMinutes: 45,
    },
    {
      itemNumber: "5060",
      description: "After-hours attendance, VR GP — prolonged",
      fee: "152.80",
      appliesTo: ["gp_fellow", "vr"],
      channel: "telehealth",
      minMinutes: 45,
      maxMinutes: null,
    },
    {
      itemNumber: "5003",
      description: "After-hours attendance, non-VR — brief",
      fee: "36.60",
      appliesTo: ["non_vr", "registrar"],
      channel: "telehealth",
      minMinutes: 0,
      maxMinutes: 5,
    },
    {
      itemNumber: "5023",
      description: "After-hours attendance, non-VR — standard",
      fee: "62.70",
      appliesTo: ["non_vr", "registrar"],
      channel: "telehealth",
      minMinutes: 5,
      maxMinutes: 25,
    },
    {
      itemNumber: "5043",
      description: "After-hours attendance, non-VR — long",
      fee: "91.35",
      appliesTo: ["non_vr", "registrar"],
      channel: "telehealth",
      minMinutes: 25,
      maxMinutes: 45,
    },
    {
      itemNumber: "597",
      description: "Urgent after-hours home visit, first patient",
      fee: "158.30",
      appliesTo: ["gp_fellow", "vr", "non_vr"],
      channel: "home_visit",
      minMinutes: 0,
      maxMinutes: null,
    },
    {
      itemNumber: "599",
      description: "Urgent after-hours home visit, additional patient",
      fee: "79.15",
      appliesTo: ["gp_fellow", "vr", "non_vr"],
      channel: "home_visit",
      minMinutes: 0,
      maxMinutes: null,
    },
    {
      itemNumber: "5010",
      description: "After-hours attendance, residential aged care facility",
      fee: "96.45",
      appliesTo: ["gp_fellow", "vr", "non_vr"],
      channel: "nh_telehealth",
      minMinutes: 0,
      maxMinutes: null,
    },
  ]);

  /* ---------------------------------------------------------------- *
   * Patients + queue
   * ---------------------------------------------------------------- */
  console.log("seeding patients and queue…");

  const szekelyFamily = randomUUID();

  type Seed = {
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
    phone: string;
    suburb: string;
    state: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
    postcode: string;
    addressLine: string;
    concession?: boolean;
    familyGroupId?: string;
    category: (typeof schema.symptomCategory.enumValues)[number];
    info: string;
    preference: "phone" | "video";
    waited: number;
    acuity?: number;
    allergies?: { substance: string; reaction?: string; severity?: string }[];
    nkda?: boolean;
  };

  const seeds: Seed[] = [
    {
      firstName: "David",
      lastName: "Szekely",
      dob: "1969-04-20",
      gender: "Male",
      phone: "0400100001",
      addressLine: "12 Rokeby Street",
      suburb: "Subiaco",
      state: "WA",
      postcode: "6008",
      familyGroupId: szekelyFamily,
      category: "mental_health_sleep_headache",
      info: "I was just curious what this text box on this random website did. Please disregard.",
      preference: "phone",
      waited: 12,
      nkda: true,
    },
    {
      firstName: "Child",
      lastName: "Szekely",
      dob: "2000-01-01",
      gender: "Male",
      phone: "0400100001",
      addressLine: "12 Rokeby Street",
      suburb: "Subiaco",
      state: "WA",
      postcode: "6008",
      familyGroupId: szekelyFamily,
      category: "mental_health_sleep_headache",
      info: "My reflection winked at me this morning. Do I need to book an exorcist or a dermatologist?",
      preference: "phone",
      waited: 12,
      nkda: true,
    },
    {
      firstName: "Carter",
      lastName: "Snowden",
      dob: "1969-04-20",
      gender: "Male",
      phone: "0400100002",
      addressLine: "146 Mackenzie Street",
      suburb: "East Toowoomba",
      state: "QLD",
      postcode: "4350",
      category: "mens_health",
      info: "I sneezed while laughing, and now I feel like I've unlocked a new dimension. Should I be worried?",
      preference: "video",
      waited: 12,
      allergies: [
        { substance: "Penicillin", reaction: "Rash", severity: "Moderate" },
      ],
    },
    {
      firstName: "Sam",
      lastName: "Henry",
      dob: "1969-08-11",
      gender: "Male",
      phone: "0400100003",
      addressLine: "8 Bourke Street",
      suburb: "Carlton",
      state: "VIC",
      postcode: "3053",
      concession: true,
      category: "medical_certificate_only",
      info: "My knee has started a one-man band. Every step sounds like a drumroll. Is this normal aging or just showmanship?",
      preference: "phone",
      waited: 12,
      acuity: 5,
      nkda: true,
    },
    {
      firstName: "Adam",
      lastName: "Surendonk",
      dob: "1969-02-02",
      gender: "Male",
      phone: "0400100004",
      addressLine: "44 Grote Street",
      suburb: "Adelaide",
      state: "SA",
      postcode: "5000",
      category: "gut_related",
      info: "Is it possible to be allergic to Mondays? Because my motivation vanishes every single one.",
      preference: "phone",
      waited: 12,
      nkda: true,
    },
    {
      firstName: "Harry",
      lastName: "Lyall",
      dob: "1969-06-30",
      gender: "Male",
      phone: "0400100005",
      addressLine: "3 Wickham Terrace",
      suburb: "Spring Hill",
      state: "QLD",
      postcode: "4000",
      category: "womens_health",
      info: "I'm sure I felt an extra toe pop in just now. Do I have more toes than I started with? HELP!",
      preference: "video",
      waited: 12,
      nkda: true,
    },
    {
      firstName: "Bowen",
      lastName: "Zhao",
      dob: "1969-11-05",
      gender: "Male",
      phone: "0400100006",
      addressLine: "77 Pitt Street",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      category: "other_issues",
      info: "Every time I yawn, my cat yawns back. Are we syncing? Should I be concerned about a yawn epidemic?",
      preference: "phone",
      waited: 12,
      nkda: true,
    },
    {
      firstName: "Srujan",
      lastName: "Basavaraj",
      dob: "1969-03-19",
      gender: "Male",
      phone: "0400100007",
      addressLine: "21 Hay Street",
      suburb: "Perth",
      state: "WA",
      postcode: "6000",
      concession: true,
      category: "skin",
      info: "Whenever I sit down, I hear my joints crackling. Is my body… caramelizing?",
      preference: "video",
      waited: 12,
      nkda: true,
    },
    {
      firstName: "Jonathan",
      lastName: "Brown",
      dob: "1979-09-14",
      gender: "Male",
      phone: "0400100008",
      addressLine: "30 Adaleigh Street",
      suburb: "Yarraville",
      state: "VIC",
      postcode: "3013",
      category: "mens_health",
      info: "Just realized my left elbow hasn't bent without clicking in five years. Is that a record?",
      preference: "video",
      waited: 12,
      nkda: true,
    },
    {
      firstName: "Cuan",
      lastName: "McLeman",
      dob: "1969-07-07",
      gender: "Male",
      phone: "0400100009",
      addressLine: "5 Elizabeth Street",
      suburb: "Hobart",
      state: "TAS",
      postcode: "7000",
      category: "medical_certificate_only",
      info: "Every time I blink, my eye makes a tiny clicking sound. Is my eyelid… running out of battery?",
      preference: "phone",
      waited: 12,
      acuity: 5,
      nkda: true,
    },
    {
      firstName: "Vix",
      lastName: "Richardson",
      dob: "1969-12-24",
      gender: "Male",
      phone: "0400100010",
      addressLine: "9 Northbourne Avenue",
      suburb: "Canberra",
      state: "ACT",
      postcode: "2601",
      category: "gut_related",
      info: "I think my thumb might be haunted. It twitches whenever I talk about ghost stories. PLEASE CONFIRM.",
      preference: "phone",
      waited: 12,
      nkda: true,
    },
    {
      firstName: "Tim",
      lastName: "Burr",
      dob: "1976-05-16",
      gender: "Male",
      phone: "0400100011",
      addressLine: "60 Smith Street",
      suburb: "Darwin",
      state: "NT",
      postcode: "0800",
      category: "mens_health",
      info: "I looked at my freckles closely, and I'm almost positive they're forming a secret code. What does it MEAN?",
      preference: "phone",
      waited: 12,
      nkda: true,
    },
  ];

  let jonathanPatientId = "";

  for (const s of seeds) {
    const [p] = await db
      .insert(patients)
      .values({
        firstName: s.firstName,
        lastName: s.lastName,
        dob: s.dob,
        gender: s.gender,
        phone: s.phone,
        addressLine: s.addressLine,
        suburb: s.suburb,
        state: s.state,
        postcode: s.postcode,
        concessionCard: s.concession ?? false,
        familyGroupId: s.familyGroupId,
        medicareNumber: `2${Math.floor(100000000 + Math.random() * 899999999)}`,
        medicareIrn: "1",
      })
      .returning();

    if (!p) continue;
    if (s.firstName === "Jonathan" && s.lastName === "Brown") jonathanPatientId = p.id;

    if (s.nkda) {
      await db.insert(patientAllergies).values({
        patientId: p.id,
        substance: "NKDA",
        isNkda: true,
      });
    }
    for (const a of s.allergies ?? []) {
      await db.insert(patientAllergies).values({
        patientId: p.id,
        substance: a.substance,
        reaction: a.reaction,
        severity: a.severity,
      });
    }

    await db.insert(consults).values({
      patientId: p.id,
      channel: "telehealth",
      status: "queued",
      preference: s.preference,
      symptomCategory: s.category,
      additionalInfo: s.info,
      acuity: s.acuity ?? 4,
      requestedAt: minsAgo(s.waited),
    });
  }

  /* ---------------------------------------------------------------- *
   * Home visit queue
   * ---------------------------------------------------------------- */
  const homeVisitSeeds = [
    {
      firstName: "Margaret",
      lastName: "O'Shea",
      dob: "1938-02-14",
      suburb: "Brunswick",
      postcode: "3056",
      addressLine: "14 Sydney Road",
      lat: "-37.767",
      lng: "144.960",
      category: "other_issues" as const,
      info: "Elderly mother had a fall in the bathroom, no head strike, unable to weight bear properly.",
      acuity: 2,
      waited: 34,
    },
    {
      firstName: "Peter",
      lastName: "Nguyen",
      dob: "1985-06-02",
      suburb: "Richmond",
      postcode: "3121",
      addressLine: "88 Swan Street",
      lat: "-37.823",
      lng: "144.998",
      category: "gut_related" as const,
      info: "Severe abdominal pain and vomiting since this afternoon, cannot keep fluids down.",
      acuity: 2,
      waited: 21,
    },
    {
      firstName: "Aisha",
      lastName: "Rahman",
      dob: "2021-11-30",
      suburb: "Northcote",
      postcode: "3070",
      addressLine: "3 High Street",
      lat: "-37.770",
      lng: "144.999",
      category: "other_issues" as const,
      info: "Four year old with high fever and a barking cough, very distressed.",
      acuity: 1,
      waited: 8,
    },
    {
      firstName: "Douglas",
      lastName: "Fairbairn",
      dob: "1944-09-08",
      suburb: "St Kilda",
      postcode: "3182",
      addressLine: "22 Acland Street",
      lat: "-37.868",
      lng: "144.978",
      category: "other_issues" as const,
      info: "Catheter blocked since this afternoon, uncomfortable and distended.",
      acuity: 3,
      waited: 52,
    },
    {
      firstName: "Yuki",
      lastName: "Tanaka",
      dob: "1996-03-21",
      suburb: "Footscray",
      postcode: "3011",
      addressLine: "7 Nicholson Street",
      lat: "-37.799",
      lng: "144.900",
      category: "skin" as const,
      info: "Spreading red rash with fever since last night, feeling very unwell.",
      acuity: 2,
      waited: 17,
    },
    {
      firstName: "Beverly",
      lastName: "Nolan",
      dob: "1935-01-12",
      suburb: "Kew",
      postcode: "3101",
      addressLine: "40 Cotham Road",
      lat: "-37.806",
      lng: "145.030",
      category: "other_issues" as const,
      info: "Aged care resident, ongoing confusion and reduced oral intake.",
      acuity: 3,
      waited: 41,
    },
  ];

  for (const h of homeVisitSeeds) {
    const [p] = await db
      .insert(patients)
      .values({
        firstName: h.firstName,
        lastName: h.lastName,
        dob: h.dob,
        gender: "Unspecified",
        phone: "0400200000",
        addressLine: h.addressLine,
        suburb: h.suburb,
        state: "VIC",
        postcode: h.postcode,
        latitude: h.lat,
        longitude: h.lng,
        concessionCard: true,
        medicareNumber: `2${Math.floor(100000000 + Math.random() * 899999999)}`,
        medicareIrn: "1",
      })
      .returning();
    if (!p) continue;

    await db.insert(patientAllergies).values({
      patientId: p.id,
      substance: "NKDA",
      isNkda: true,
    });

    await db.insert(consults).values({
      patientId: p.id,
      channel: "home_visit",
      status: "queued",
      preference: "phone",
      symptomCategory: h.category,
      additionalInfo: h.info,
      acuity: h.acuity,
      requestedAt: minsAgo(h.waited),
    });
  }

  /* ---------------------------------------------------------------- *
   * Jonathan Brown's history — gives the AI summary something to read
   * ---------------------------------------------------------------- */
  console.log("seeding consult history…");
  if (jonathanPatientId) {
    const history: { days: number; body: string }[] = [
      {
        days: 14,
        body: [
          "Dr Jonathan Brown",
          "3 points of ID checked",
          "Phone consultation",
          "",
          "PC - Diarrhoea",
          "",
          "HPC -",
          "- Recently returned from Bali",
          "- Loose stools four days",
          "- No blood in stool",
          "- Afebrile",
          "",
          "PMH - Asthma, Type 2 DM",
          "DH - Ventolin inhaler as needed",
          "SH - Non smoker",
          "",
          "Examination - Speaking in full sentences",
          "",
          "Impression - Traveller's diarrhoea",
          "",
          "Plan -",
          "- Oral rehydration",
          "- Review if blood in stool or fever",
        ].join("\n"),
      },
      {
        days: 12,
        body: [
          "Dr Jonathan Brown",
          "3 points of ID checked",
          "Video consultation",
          "",
          "PC - Cough",
          "",
          "HPC -",
          "- Dry cough five days",
          "- No shortness of breath",
          "- Mild coryzal symptoms",
          "",
          "PMH - Asthma, Type 2 DM",
          "DH - Ventolin inhaler as needed",
          "",
          "Impression - Viral upper respiratory tract infection",
          "",
          "Plan -",
          "- Symptomatic management",
          "- Ventolin as needed",
          "- Review if wheeze worsens",
        ].join("\n"),
      },
      {
        days: 7,
        body: [
          "Dr Jonathan Brown",
          "3 points of ID checked",
          "Phone consultation",
          "",
          "PC - Dysuria",
          "",
          "HPC -",
          "- Burning on urination two days",
          "- Frequency and urgency",
          "- No flank pain, no fever",
          "",
          "PMH - Asthma, Type 2 DM",
          "",
          "Impression - Lower urinary tract infection",
          "",
          "Plan -",
          "- Nitrofurantoin 100 mg BD for 5 days",
          "- Increase fluids",
          "- Review if fever or flank pain",
        ].join("\n"),
      },
    ];

    for (const h of history) {
      const [c] = await db
        .insert(consults)
        .values({
          patientId: jonathanPatientId,
          doctorId: drJonathan.id,
          channel: "telehealth",
          status: "closed",
          preference: "phone",
          symptomCategory: "gut_related",
          additionalInfo: "Historical consult",
          requestedAt: daysAgo(h.days),
          claimedAt: daysAgo(h.days),
          startedAt: daysAgo(h.days),
          endedAt: daysAgo(h.days),
          notes: h.body,
          notesAttestedAt: daysAgo(h.days),
        })
        .returning();

      if (c) {
        await db.insert(noteRevisions).values({
          consultId: c.id,
          authorId: drJonathan.id,
          body: h.body,
          aiGenerated: false,
        });
        await db.insert(billings).values({
          consultId: c.id,
          doctorId: drJonathan.id,
          itemNumber: "5020",
          description: "After-hours attendance, VR GP — standard",
          fee: "78.40",
          status: "paid",
          submittedAt: daysAgo(h.days - 1),
        });
      }
    }
  }

  /* ---------------------------------------------------------------- *
   * Closed shifts for the demo doctor
   *
   * Consult History and Billing History are both views over closed consults,
   * and the Inbox is a view over the investigations ordered in them. Without
   * a worked history all three screens are empty on the demo account, so
   * these are past shifts for David rather than more patients in the queue.
   * ---------------------------------------------------------------- */
  console.log("seeding closed consults…");

  const past: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
    addressLine: string;
    suburb: string;
    state: (typeof schema.auStateEnum.enumValues)[number];
    postcode: string;
    /** Whole days back from now that the consult closed. */
    days: number;
    /** Local hour it closed — after-hours, so mostly evening. */
    hour: number;
    /**
     * Overrides `days`/`hour` to place the consult a few hours ago, so the
     * "consultations today" counter has something to count whenever the
     * demo is seeded.
     */
    hoursAgo?: number;
    category: (typeof schema.symptomCategory.enumValues)[number];
    info: string;
    item: string | null;
    fee: string;
    billing: "paid" | "submitted" | "pending" | "no_billing";
    noBillingReason?: string;
    impression: string;
    plan: string[];
    investigation?: {
      type: "pathology" | "radiology";
      tests: string;
      status: "ordered" | "resulted";
      isAbnormal?: boolean;
      resultBody?: string;
    };
  }[] = [
    {
      firstName: "Priya", lastName: "Raman", dob: "1989-02-17", gender: "female",
      addressLine: "9 Bellair St", suburb: "Kensington", state: "VIC", postcode: "3031",
      days: 0, hour: 0, hoursAgo: 2, category: "womens_health",
      info: "Bad period pain, worse than usual, nothing is touching it.",
      item: "5020", fee: "78.40", billing: "pending",
      impression: "Primary dysmenorrhoea, no red flags",
      plan: ["Regular ibuprofen with food", "Heat pack", "GP review if pattern changes"],
    },
    {
      firstName: "Daniel", lastName: "Okafor", dob: "1995-12-09", gender: "male",
      addressLine: "31 Nicholson St", suburb: "Fitzroy", state: "VIC", postcode: "3065",
      days: 0, hour: 0, hoursAgo: 4, category: "medical_certificate_only",
      info: "Off work with a migraine today, need a certificate for my employer.",
      item: "5000", fee: "45.75", billing: "pending",
      impression: "Migraine without aura, resolving",
      plan: ["Medical certificate issued for today", "Usual triptan as prescribed by GP"],
    },
    {
      firstName: "Tymira", lastName: "Rogers", dob: "1998-03-14", gender: "female",
      addressLine: "12 Hoddle St", suburb: "Abbotsford", state: "VIC", postcode: "3067",
      days: 1, hour: 20, category: "womens_health",
      info: "Burning when passing urine since yesterday, going constantly.",
      item: "5020", fee: "78.40", billing: "pending",
      impression: "Lower urinary tract infection",
      plan: ["Nitrofurantoin 100 mg BD for 5 days", "Increase fluids", "Urine MCS sent"],
      investigation: { type: "pathology", tests: "Urine MCS", status: "ordered" },
    },
    {
      firstName: "Oliver", lastName: "Baker", dob: "2010-06-02", gender: "male",
      addressLine: "4 Rosslyn St", suburb: "West Melbourne", state: "VIC", postcode: "3003",
      days: 1, hour: 21, category: "skin",
      info: "Rash on both arms after starting a new washing powder.",
      item: "5000", fee: "45.75", billing: "pending",
      impression: "Contact dermatitis",
      plan: ["Cease the new detergent", "Hydrocortisone 1% BD for 7 days", "Review if spreading"],
    },
    {
      firstName: "Omar", lastName: "El Kordi", dob: "1991-11-23", gender: "male",
      addressLine: "88 Sydney Rd", suburb: "Brunswick", state: "VIC", postcode: "3056",
      days: 2, hour: 22, category: "other_issues",
      info: "Ran out of my blood pressure tablets, pharmacy shut until Monday.",
      item: "5000", fee: "45.75", billing: "paid",
      impression: "Urgent repeat supply, stable hypertension",
      plan: ["Perindopril 5 mg daily — 1 month supply", "See usual GP for ongoing scripts"],
    },
    {
      firstName: "Sarita", lastName: "Basnet", dob: "1992-01-30", gender: "female",
      addressLine: "27 Union St", suburb: "Northcote", state: "VIC", postcode: "3070",
      days: 3, hour: 19, category: "other_issues",
      info: "Twisted my ankle at netball, can weight bear but it's swollen.",
      item: "5020", fee: "78.40", billing: "paid",
      impression: "Grade 1 lateral ankle sprain, Ottawa rules negative",
      plan: ["RICE", "Paracetamol and ibuprofen as needed", "Review in 5 days if not improving"],
      investigation: {
        type: "radiology", tests: "X-ray left ankle", status: "resulted",
        resultBody: "No acute bony injury. Soft tissue swelling laterally.",
      },
    },
    {
      firstName: "Taniele", lastName: "Johnston", dob: "2008-09-05", gender: "female",
      addressLine: "3 Kenny St", suburb: "Coburg", state: "VIC", postcode: "3058",
      days: 4, hour: 23, category: "skin",
      info: "Sunburn from the weekend has blistered across my shoulders.",
      item: "5040", fee: "114.20", billing: "paid",
      impression: "Superficial partial-thickness sunburn, approx 4% BSA",
      plan: ["Non-adherent dressings", "Analgesia", "GP review in 48 hours for wound check"],
    },
    {
      firstName: "Barbara", lastName: "Mead", dob: "1957-04-19", gender: "female",
      addressLine: "16 Wheadon St", suburb: "Osborne", state: "SA", postcode: "5017",
      days: 6, hour: 21, category: "gut_related",
      info: "I have gastro. I've been vomiting and had diarrhoea most of the day.",
      item: "5020", fee: "78.40", billing: "paid",
      impression: "Viral gastroenteritis, mildly dehydrated",
      plan: ["Oral rehydration", "Small frequent fluids", "Present to ED if unable to keep fluids down"],
    },
    {
      firstName: "Corey", lastName: "Barratt", dob: "2007-02-08", gender: "male",
      addressLine: "5 Britton St", suburb: "Gawler West", state: "SA", postcode: "5118",
      days: 6, hour: 22, category: "gut_related",
      info: "Stomach pain and cramps, vomiting, shaking chills. 7/10 pain.",
      item: null, fee: "0.00", billing: "no_billing",
      noBillingReason: "Escalated to emergency department mid-call — advised 000, no service provided",
      impression: "Query appendicitis — referred to ED",
      plan: ["Ambulance called", "Nil by mouth", "Handover given to receiving hospital"],
    },
    {
      firstName: "Anish", lastName: "Gurung", dob: "2001-07-11", gender: "male",
      addressLine: "3a Raymond Ave", suburb: "North Plympton", state: "SA", postcode: "5037",
      days: 8, hour: 20, category: "medical_certificate_only",
      info: "Had a headache this afternoon and called in sick. Only need a certificate.",
      item: "5000", fee: "45.75", billing: "paid",
      impression: "Resolved tension headache",
      plan: ["Medical certificate issued for one day", "Simple analgesia if recurs"],
    },
    {
      firstName: "Mali", lastName: "Toetu", dob: "2005-05-27", gender: "female",
      addressLine: "86 Edgeware Rd", suburb: "Enmore", state: "NSW", postcode: "2042",
      days: 9, hour: 23, category: "other_issues",
      info: "A cold last week has triggered my asthma, short of breath on stairs.",
      item: "5040", fee: "114.20", billing: "paid",
      impression: "Asthma exacerbation, post-viral. No features of severe attack.",
      plan: ["Ventolin 4 puffs via spacer 4-hourly", "Prednisolone 25 mg daily for 5 days", "Written action plan reviewed"],
    },
    {
      firstName: "Simon", lastName: "Fong", dob: "1970-12-01", gender: "male",
      addressLine: "125 Hawthorn Rd", suburb: "Forest Hill", state: "VIC", postcode: "3131",
      days: 11, hour: 19, category: "other_issues",
      info: "Ear infection, red swelling in the ear canal.",
      item: "5020", fee: "78.40", billing: "paid",
      impression: "Otitis externa",
      plan: ["Ciprofloxacin/hydrocortisone drops TDS for 7 days", "Keep the ear dry"],
    },
    {
      firstName: "Linda", lastName: "Barnes", dob: "1982-08-16", gender: "female",
      addressLine: "3 Pasteur St", suburb: "Sunnybank", state: "QLD", postcode: "4109",
      days: 13, hour: 22, category: "mental_health_sleep_headache",
      info: "Haven't slept properly in two weeks, very anxious about work.",
      item: "5060", fee: "152.80", billing: "paid",
      impression: "Adjustment disorder with anxiety, insomnia. No suicidal ideation.",
      plan: ["Sleep hygiene discussed", "No sedative prescribed — explained rationale", "GP follow-up within 7 days for mental health plan"],
    },
    {
      firstName: "Blake", lastName: "Shadbolt", dob: "2008-01-09", gender: "male",
      addressLine: "11a Nolan St", suburb: "Bendigo", state: "VIC", postcode: "3550",
      days: 15, hour: 20, category: "other_issues",
      info: "Sore throat, can't talk.",
      item: "5020", fee: "78.40", billing: "paid",
      impression: "Viral pharyngitis, Centor 1",
      plan: ["Symptomatic treatment", "No antibiotic indicated", "Throat swab if not settling"],
      investigation: {
        type: "pathology", tests: "Throat swab MCS", status: "resulted", isAbnormal: true,
        resultBody: "Group A streptococcus isolated. Sensitive to penicillin.",
      },
    },
    {
      firstName: "Charlie", lastName: "Telford", dob: "2019-03-22", gender: "male",
      addressLine: "2/14 Bristol Ct", suburb: "Kilsyth", state: "VIC", postcode: "3137",
      days: 17, hour: 21, category: "other_issues",
      info: "Day 10 post-viral cough getting worse overnight.",
      item: "5040", fee: "114.20", billing: "paid",
      impression: "Post-viral cough, no focal chest signs on history",
      plan: ["Reassurance", "Red flags given to parent", "Face-to-face review if fevers return"],
      investigation: {
        type: "radiology", tests: "Chest X-ray", status: "resulted",
        resultBody: "Clear lung fields. No consolidation.",
      },
    },
    {
      firstName: "Kelly", lastName: "Griggs", dob: "1976-10-04", gender: "female",
      addressLine: "145a Hopetoun St", suburb: "Kurri Kurri", state: "NSW", postcode: "2327",
      days: 20, hour: 23, category: "other_issues",
      info: "Fell out of bed last night, now hard to take a deep breath. Sore right side.",
      item: "5060", fee: "152.80", billing: "paid",
      impression: "Query rib fracture, no respiratory compromise",
      plan: ["Analgesia", "Deep breathing exercises", "Chest X-ray arranged"],
      investigation: { type: "radiology", tests: "Chest X-ray — right ribs", status: "ordered" },
    },
  ];

  for (const v of past) {
    const closedAt =
      v.hoursAgo !== undefined
        ? new Date(Date.now() - v.hoursAgo * 3_600_000)
        : daysAgo(v.days);
    if (v.hoursAgo === undefined) closedAt.setHours(v.hour, 0, 0, 0);
    const startedAt = new Date(closedAt.getTime() - 14 * 60_000);

    const [p] = await db
      .insert(patients)
      .values({
        firstName: v.firstName,
        lastName: v.lastName,
        dob: v.dob,
        gender: v.gender,
        phone: `04${Math.floor(10_000_000 + Math.random() * 89_999_999)}`,
        addressLine: v.addressLine,
        suburb: v.suburb,
        state: v.state,
        postcode: v.postcode,
        medicareNumber: `2${Math.floor(100_000_000 + Math.random() * 899_999_999)}`,
        medicareIrn: "1",
      })
      .returning();
    if (!p) continue;

    const notes = [
      "Dr David Szekely",
      "3 points of ID checked",
      "Patient aware that this is a bulk billed consultation and consents to being bulk billed",
      "",
      `PC - ${v.info}`,
      "",
      `Impression - ${v.impression}`,
      "",
      "Plan -",
      ...v.plan.map((l) => `- ${l}`),
    ].join("\n");

    const [c] = await db
      .insert(consults)
      .values({
        patientId: p.id,
        doctorId: david.id,
        channel: "telehealth",
        status: "closed",
        preference: v.days % 2 === 0 ? "video" : "phone",
        symptomCategory: v.category,
        additionalInfo: v.info,
        requestedAt: new Date(startedAt.getTime() - 22 * 60_000),
        claimedAt: new Date(startedAt.getTime() - 2 * 60_000),
        startedAt,
        endedAt: closedAt,
        notes,
        notesAttestedAt: closedAt,
      })
      .returning();
    if (!c) continue;

    await db.insert(noteRevisions).values({
      consultId: c.id,
      authorId: david.id,
      body: notes,
      aiGenerated: false,
    });

    await db.insert(billings).values({
      consultId: c.id,
      doctorId: david.id,
      itemNumber: v.item,
      description: v.item
        ? "After-hours attendance, VR GP"
        : "No billing recorded",
      fee: v.fee,
      status: v.billing,
      noBillingReason: v.noBillingReason ?? null,
      submittedAt:
        v.billing === "paid" || v.billing === "submitted"
          ? new Date(closedAt.getTime() + 12 * 3_600_000)
          : null,
    });

    if (v.investigation) {
      await db.insert(investigations).values({
        consultId: c.id,
        type: v.investigation.type,
        tests: v.investigation.tests,
        clinicalNotes: v.impression,
        copyToGp: true,
        status: v.investigation.status,
        orderedByDoctorId: david.id,
        resultBody: v.investigation.resultBody ?? null,
        isAbnormal: v.investigation.isAbnormal ?? false,
        resultedAt:
          v.investigation.status === "resulted"
            ? new Date(closedAt.getTime() + 36 * 3_600_000)
            : null,
        createdAt: closedAt,
      });
    }
  }

  /* ---------------------------------------------------------------- *
   * Doctor applications
   *
   * Recruitment records from the public site. None of these is an account —
   * an applicant cannot sign in until the operator issues credentials.
   * ---------------------------------------------------------------- */
  console.log("seeding doctor applications…");
  await db.insert(doctorApplications).values([
    {
      firstName: "James",
      lastName: "Thornton",
      email: "james.thornton@example.test",
      phone: "0499888777",
      ahpraNumber: "MED0001234567",
      yearsExperience: "8 – 12 years",
      specialty: "General Practice",
      employment: "part_time",
      coverLetter:
        "Twelve years across emergency and general practice. Looking for two evening shifts a week around my clinic work.",
      status: "submitted",
      createdAt: daysAgo(1),
    },
    {
      firstName: "Priya",
      lastName: "Nandakumar",
      email: "priya.nandakumar@example.test",
      phone: "0455222111",
      ahpraNumber: "MED0007654321",
      yearsExperience: "4 – 7 years",
      specialty: "Paediatrics",
      employment: "part_time",
      status: "submitted",
      createdAt: daysAgo(3),
    },
    {
      firstName: "Marcus",
      lastName: "Whitfield",
      email: "marcus.whitfield@example.test",
      phone: "0433444555",
      ahpraNumber: "MED0002468101",
      yearsExperience: "13+ years",
      specialty: "General Practice",
      employment: "full_time",
      coverLetter: "Recently relocated from Perth. Available for full-time night work.",
      status: "reviewing",
      reviewedAt: daysAgo(4),
      reviewedByDoctorId: david.id,
      reviewNote: "AHPRA check requested. Awaiting indemnity certificate.",
      createdAt: daysAgo(9),
    },
    {
      firstName: "Alina",
      lastName: "Petrov",
      email: "alina.petrov@example.test",
      phone: "0466777888",
      ahpraNumber: "MED0001357911",
      yearsExperience: "1 – 3 years",
      specialty: "Mental Health",
      employment: "part_time",
      status: "declined",
      reviewedAt: daysAgo(11),
      reviewedByDoctorId: david.id,
      reviewNote:
        "Below the minimum post-fellowship experience for unsupervised after-hours work.",
      createdAt: daysAgo(14),
    },
  ]);

  /* ---------------------------------------------------------------- *
   * Clinical chat
   * ---------------------------------------------------------------- */
  console.log("seeding chat…");
  const chat: { who: string; id: string | null; body: string; mins: number }[] = [
    {
      who: "Dr Adam Surendonk",
      id: null,
      body: "I'm serious! It's safe, reusable, and effective. Imagine the clinic savings if we ditch meds and just hand out socks!",
      mins: 26,
    },
    {
      who: "Dr Harry Lyall",
      id: null,
      body: "Well, sign me up! I'll take a Magic Sock if it means I can skip my night shift tomorrow.",
      mins: 25,
    },
    {
      who: "Dr David Szekely",
      id: david.id,
      body: "Please, don't encourage him. This is just going to spiral out of control. We'll end up with a sock cult.",
      mins: 24,
    },
    {
      who: "Dr Srujan Basavaraj",
      id: null,
      body: "Maybe a sock cult is exactly what we need. Things are getting stale around here.",
      mins: 23,
    },
    {
      who: "Dr Sam Henry",
      id: null,
      body: "im just picturing us all walking around with socks on our heads chanting 'sock of healing' lmao",
      mins: 22,
    },
    {
      who: "Dr Adam Surendonk",
      id: null,
      body: "Laugh all you want, but the sock worked for me. I can't wait for you all to realize the potential.",
      mins: 21,
    },
    {
      who: "Dr Carter Snowden",
      id: carter.id,
      body: "Alright, fine. I'll try it. But if it doesn't work, I'm posting a 'Sock Myth Debunked' sign in the break room.",
      mins: 20,
    },
    {
      who: "Dr Harry Lyall",
      id: null,
      body: "Just don't blame him if the 'healing energies' turn you into a sock believer.",
      mins: 19,
    },
    {
      who: "Dr Bowen Zhao",
      id: bowen.id,
      body: "Queue is at 69 and climbing, could someone pick up the Toowoomba gentleman please.",
      mins: 6,
    },
  ];

  for (const m of chat) {
    await db.insert(chatMessages).values({
      channel: "clinical",
      authorId: m.id,
      authorName: m.who,
      body: m.body,
      createdAt: minsAgo(m.mins),
    });
  }

  await db.insert(chatMessages).values([
    {
      channel: "dispatcher",
      authorId: null,
      authorName: "Dispatch — Nicole",
      body: "Evening all. Two cars covering the north east tonight, one covering bayside.",
      createdAt: minsAgo(40),
    },
    {
      channel: "dispatcher",
      authorId: null,
      authorName: "Dispatch — Nicole",
      body: "If you need a home visit escalation from telehealth, message here and I'll check who is closest.",
      createdAt: minsAgo(38),
    },
  ]);

  console.log("done.");
  console.log("");
  console.log("  Sign in with any seeded doctor:");
  for (const d of doctorRows) console.log(`    ${d.email}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log("");
  await closeDatabase();
}

main().catch(async (err) => {
  console.error(err);
  await closeDatabase();
  process.exit(1);
});
