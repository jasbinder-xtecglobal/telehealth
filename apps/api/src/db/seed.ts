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
  consults,
  consultTranscripts,
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
