/**
 * DEVELOPMENT / DEMO DATA ONLY.
 *
 * Every record here is fictional: names are invented, emails use the reserved
 * example.com domain, phone numbers are placeholders, and all codes contain
 * "DEMO". Safe to re-run (records are upserted by their unique codes).
 * Refuses to run when NODE_ENV=production.
 *
 * Real Super Admins are provisioned through SUPER_ADMIN_EMAILS on first sign-in.
 * Demo agents sign in at /login → Agent with their agent code (AGT-DEMO1…) or email
 * (demo.agent1@example.com…) and the password in DEMO_AGENT_PASSWORD below. AGT-DEMO4
 * is flagged to change it on first sign-in; AGT-DEMO5 is INACTIVE and cannot sign in.
 * Re-running the seed resets the demo agents' passwords.
 */
import { createDatabase } from "../src/config/database.js";
import { installCatalog } from "../src/modules/catalog/catalog.service.js";
import { getCatalogTemplate } from "../src/modules/catalog/templates/index.js";
import { hashPassword } from "../src/modules/auth/password.js";
import type { Prisma } from "../src/generated/prisma/client.js";
import type {
  InsuranceType,
  PaymentMethod,
  PaymentStatus,
  PremiumFrequency,
  SoldPolicyStatus,
} from "../src/generated/prisma/enums.js";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demo data when NODE_ENV=production.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const db = createDatabase(process.env.DATABASE_URL);

/** Development-only shared password for the fictional demo agents. */
const DEMO_AGENT_PASSWORD = "DemoAgent@2026";

const DAY = 86_400_000;
const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
const daysAgo = (days: number) => new Date(today.getTime() - days * DAY);
const addMonthsMinusDay = (date: Date, months: number) => {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  result.setUTCDate(result.getUTCDate() - 1);
  return result;
};

// ─── Catalog ──────────────────────────────────────────────────────────────────
interface PolicySeed {
  policyCode: string;
  policyName: string;
  insuranceType: InsuranceType;
  description: string;
  coverageAmount: number;
  premium: number;
  premiumFrequency: PremiumFrequency;
  durationMonths: number;
  eligibility: string;
  benefits: string[];
  terms: string;
  categoryDetails: Prisma.InputJsonValue;
  status: "ACTIVE" | "INACTIVE";
}

const healthTerms =
  "Pre-existing diseases covered after the waiting period. Claims subject to policy wording.";
const motorTerms = "Valid RC and driving licence required. Claims subject to survey.";

const policies: PolicySeed[] = [
  {
    policyCode: "DEMO-HLT-BAS",
    policyName: "Health Basic",
    insuranceType: "HEALTH",
    description: "Entry-level individual health cover for hospitalization and day-care costs.",
    coverageAmount: 300_000,
    premium: 6_499,
    premiumFrequency: "ANNUAL",
    durationMonths: 12,
    eligibility: "Individuals aged 18–55.",
    benefits: ["Cashless network hospitals", "Day-care procedures", "Ambulance cover"],
    terms: healthTerms,
    status: "ACTIVE",
    categoryDetails: {
      kind: "HEALTH",
      planType: "INDIVIDUAL",
      sumInsured: 300_000,
      hospitalizationCoverage: "Room rent up to 1% of sum insured per day",
      waitingPeriod: "30 days initial, 3 years for pre-existing diseases",
      ageEligibility: "18–55 years",
    },
  },
  {
    policyCode: "DEMO-HLT-PRM",
    policyName: "Health Premium",
    insuranceType: "HEALTH",
    description: "Comprehensive individual cover with OPD benefits.",
    coverageAmount: 1_000_000,
    premium: 14_999,
    premiumFrequency: "ANNUAL",
    durationMonths: 12,
    eligibility: "Individuals aged 18–65.",
    benefits: ["No room rent capping", "OPD cover", "Annual health check-up"],
    terms: healthTerms,
    status: "ACTIVE",
    categoryDetails: {
      kind: "HEALTH",
      planType: "INDIVIDUAL",
      sumInsured: 1_000_000,
      hospitalizationCoverage: "Single private room",
      waitingPeriod: "30 days initial, 2 years for pre-existing diseases",
      ageEligibility: "18–65 years",
    },
  },
  {
    policyCode: "DEMO-HLT-GLD",
    policyName: "Health Gold",
    insuranceType: "HEALTH",
    description: "High sum insured plan with restoration benefit.",
    coverageAmount: 2_500_000,
    premium: 24_999,
    premiumFrequency: "ANNUAL",
    durationMonths: 12,
    eligibility: "Individuals aged 18–65.",
    benefits: ["100% restoration", "Global second opinion", "No-claim bonus"],
    terms: healthTerms,
    status: "ACTIVE",
    categoryDetails: {
      kind: "HEALTH",
      planType: "INDIVIDUAL",
      sumInsured: 2_500_000,
      hospitalizationCoverage: "Any room category",
      waitingPeriod: "30 days initial, 2 years for pre-existing diseases",
      ageEligibility: "18–65 years",
    },
  },
  {
    policyCode: "DEMO-HLT-FAM",
    policyName: "Family Health Plus",
    insuranceType: "HEALTH",
    description: "Family floater for self, spouse and up to three children.",
    coverageAmount: 1_500_000,
    premium: 28_999,
    premiumFrequency: "ANNUAL",
    durationMonths: 12,
    eligibility: "Adults 18–60, children 91 days–25 years.",
    benefits: ["Single floater sum insured", "Newborn cover", "Maternity add-on"],
    terms: healthTerms,
    status: "ACTIVE",
    categoryDetails: {
      kind: "HEALTH",
      planType: "FAMILY",
      sumInsured: 1_500_000,
      hospitalizationCoverage: "Single private room",
      waitingPeriod: "30 days initial, 3 years for pre-existing diseases",
      ageEligibility: "Adults 18–60, children 91 days–25 years",
    },
  },
  {
    policyCode: "DEMO-HLT-MAT",
    policyName: "Maternity Care Plus",
    insuranceType: "HEALTH",
    description: "Family plan with maternity and newborn benefits (retired).",
    coverageAmount: 700_000,
    premium: 18_499,
    premiumFrequency: "ANNUAL",
    durationMonths: 12,
    eligibility: "Couples aged 21–45.",
    benefits: ["Maternity cover", "Newborn vaccination"],
    terms: healthTerms,
    status: "INACTIVE",
    categoryDetails: {
      kind: "HEALTH",
      planType: "FAMILY",
      sumInsured: 700_000,
      hospitalizationCoverage: "Single private room",
      waitingPeriod: "2 years for maternity",
      ageEligibility: "21–45 years",
    },
  },
  {
    policyCode: "DEMO-MTR-CBS",
    policyName: "Car Basic",
    insuranceType: "MOTOR",
    description: "Third-party liability cover for private cars.",
    coverageAmount: 750_000,
    premium: 3_416,
    premiumFrequency: "ANNUAL",
    durationMonths: 12,
    eligibility: "Private cars with valid registration.",
    benefits: ["Third-party liability", "Owner-driver PA cover"],
    terms: motorTerms,
    status: "ACTIVE",
    categoryDetails: {
      kind: "MOTOR",
      vehicleType: "PRIVATE_CAR",
      coverageType: "THIRD_PARTY",
      ownDamage: "Not covered",
      thirdPartyCoverage: "Unlimited injury/death; property up to ₹7,50,000",
      vehicleEligibility: "Any private car with valid RC",
    },
  },
  {
    policyCode: "DEMO-MTR-CCM",
    policyName: "Car Comprehensive",
    insuranceType: "MOTOR",
    description: "Own damage plus third-party cover for private cars.",
    coverageAmount: 800_000,
    premium: 12_499,
    premiumFrequency: "ANNUAL",
    durationMonths: 12,
    eligibility: "Private cars up to 10 years old.",
    benefits: ["Own damage", "Theft & fire", "Cashless garages"],
    terms: motorTerms,
    status: "ACTIVE",
    categoryDetails: {
      kind: "MOTOR",
      vehicleType: "PRIVATE_CAR",
      coverageType: "COMPREHENSIVE",
      ownDamage: "Up to IDV of ₹8,00,000",
      thirdPartyCoverage: "Unlimited injury/death; property up to ₹7,50,000",
      vehicleEligibility: "Private cars up to 10 years old",
    },
  },
  {
    policyCode: "DEMO-MTR-CPR",
    policyName: "Car Premium",
    insuranceType: "MOTOR",
    description: "Comprehensive cover with zero depreciation.",
    coverageAmount: 1_500_000,
    premium: 21_999,
    premiumFrequency: "ANNUAL",
    durationMonths: 12,
    eligibility: "Private cars up to 5 years old.",
    benefits: ["Zero depreciation", "Engine protect", "Roadside assistance"],
    terms: motorTerms,
    status: "ACTIVE",
    categoryDetails: {
      kind: "MOTOR",
      vehicleType: "PRIVATE_CAR",
      coverageType: "COMPREHENSIVE",
      ownDamage: "Up to IDV of ₹15,00,000 with zero depreciation",
      thirdPartyCoverage: "Unlimited injury/death; property up to ₹7,50,000",
      vehicleEligibility: "Private cars up to 5 years old",
    },
  },
  {
    policyCode: "DEMO-MTR-SEC",
    policyName: "Motor Secure",
    insuranceType: "MOTOR",
    description: "Comprehensive car cover with return-to-invoice.",
    coverageAmount: 1_000_000,
    premium: 17_499,
    premiumFrequency: "ANNUAL",
    durationMonths: 12,
    eligibility: "Private cars up to 3 years old.",
    benefits: ["Return to invoice", "Consumables cover", "Key replacement"],
    terms: motorTerms,
    status: "ACTIVE",
    categoryDetails: {
      kind: "MOTOR",
      vehicleType: "PRIVATE_CAR",
      coverageType: "COMPREHENSIVE",
      ownDamage: "Up to invoice value of ₹10,00,000",
      thirdPartyCoverage: "Unlimited injury/death; property up to ₹7,50,000",
      vehicleEligibility: "Private cars up to 3 years old",
    },
  },
  {
    policyCode: "DEMO-MTR-TWB",
    policyName: "Two Wheeler Basic",
    insuranceType: "MOTOR",
    description: "Third-party cover for scooters and motorcycles.",
    coverageAmount: 100_000,
    premium: 714,
    premiumFrequency: "ANNUAL",
    durationMonths: 12,
    eligibility: "Two-wheelers with valid registration.",
    benefits: ["Third-party liability", "Owner-rider PA cover"],
    terms: motorTerms,
    status: "ACTIVE",
    categoryDetails: {
      kind: "MOTOR",
      vehicleType: "TWO_WHEELER",
      coverageType: "THIRD_PARTY",
      ownDamage: "Not covered",
      thirdPartyCoverage: "Unlimited injury/death; property up to ₹1,00,000",
      vehicleEligibility: "Any two-wheeler with valid RC",
    },
  },
];

// ─── People (fictional) ───────────────────────────────────────────────────────
const agents = [
  { agentCode: "AGT-DEMO1", fullName: "Demo Agent Asha", phone: "+91 90000 00001" },
  { agentCode: "AGT-DEMO2", fullName: "Demo Agent Bharat", phone: "+91 90000 00002" },
  { agentCode: "AGT-DEMO3", fullName: "Demo Agent Chitra", phone: "+91 90000 00003" },
  { agentCode: "AGT-DEMO4", fullName: "Demo Agent Dev", phone: "+91 90000 00004" },
  { agentCode: "AGT-DEMO5", fullName: "Demo Agent Esha", phone: "+91 90000 00005" },
];

const customerNames = [
  "Demo Customer Aarav",
  "Demo Customer Bina",
  "Demo Customer Chetan",
  "Demo Customer Diya",
  "Demo Customer Eshan",
  "Demo Customer Farah",
  "Demo Customer Gopal",
  "Demo Customer Hema",
  "Demo Customer Ishaan",
  "Demo Customer Jaya",
  "Demo Customer Kabir",
  "Demo Customer Lata",
];
const cities = [
  ["Mumbai", "Maharashtra"],
  ["Pune", "Maharashtra"],
  ["Bengaluru", "Karnataka"],
  ["Chennai", "Tamil Nadu"],
  ["Delhi", "Delhi"],
  ["Jaipur", "Rajasthan"],
] as const;

async function main() {
  console.warn("Seeding DEMO data (development only)…");

  await db.user.upsert({
    where: { email: "admin@insurex.example.com" },
    update: {},
    create: { email: "admin@insurex.example.com", role: "SUPER_ADMIN" },
  });

  const passwordHash = await hashPassword(DEMO_AGENT_PASSWORD);

  // Insurance companies are platform master data.
  const insurerSeeds = [
    { code: "TATA_AIA", name: "TATA AIA Life Insurance" },
    { code: "TATA_AIG", name: "TATA AIG General Insurance" },
    { code: "LIC", name: "Life Insurance Corporation of India" },
    { code: "HDFC_LIFE", name: "HDFC Life" },
    { code: "DIGIT", name: "Go Digit General Insurance" },
  ];
  const insurers: Record<string, { id: string; code: string }> = {};
  for (const insurer of insurerSeeds) {
    insurers[insurer.code] = await db.insurer.upsert({
      where: { code: insurer.code },
      update: { name: insurer.name },
      create: insurer,
    });
  }

  /** A tenant, its single admin, its insurers, and (the first time) each insurer's catalog. */
  async function ensureTenant(input: {
    name: string;
    legalName: string;
    adminEmail: string;
    insurers: { code: string; businessCode: string; licenceCode: string }[];
  }) {
    const first = input.insurers[0]!;
    const link = await db.tenantInsurer.findFirst({
      where: { insurerId: insurers[first.code]!.id, businessCode: first.businessCode },
      include: { tenant: true },
    });
    const tenant =
      link?.tenant ??
      (await db.tenant.create({ data: { name: input.name, legalName: input.legalName } }));
    const credentials = { passwordHash, mustChangePassword: false };
    await db.user.upsert({
      where: { email: input.adminEmail },
      update: credentials,
      create: {
        email: input.adminEmail,
        role: "TENANT_ADMIN",
        tenantId: tenant.id,
        ...credentials,
      },
    });
    for (const item of input.insurers) {
      const insurer = insurers[item.code]!;
      await db.tenantInsurer.upsert({
        where: { tenantId_insurerId: { tenantId: tenant.id, insurerId: insurer.id } },
        update: {},
        create: {
          tenantId: tenant.id,
          insurerId: insurer.id,
          businessCode: item.businessCode,
          licenceCode: item.licenceCode,
        },
      });
      const template = getCatalogTemplate(item.code);
      const loaded = await db.policyCategory.count({
        where: { tenantId: tenant.id, insurerId: insurer.id },
      });
      if (template && loaded === 0) {
        await db.$transaction((tx) => installCatalog(tx, tenant.id, insurer, template), {
          timeout: 60_000,
        });
      }
    }
    return tenant;
  }

  // Tenant A: an agency selling for TATA AIG (health/motor demo data below) and TATA AIA (life).
  const tenantA = await ensureTenant({
    name: "Demo Aakruthi Enterprises",
    legalName: "Demo Aakruthi Enterprises Pvt Ltd",
    adminEmail: "demo.tenantadmin.a@example.com",
    insurers: [
      { code: "TATA_AIG", businessCode: "DEMO-BC-AIG-001", licenceCode: "DEMO-LIC-AIG-001" },
      { code: "TATA_AIA", businessCode: "DEMO-BC-AIA-001", licenceCode: "DEMO-LIC-AIA-001" },
    ],
  });
  // Tenant B: a different agency on TATA AIA only; proves tenants cannot see each other.
  const tenantB = await ensureTenant({
    name: "Demo XYZ Enterprises",
    legalName: "Demo XYZ Enterprises Pvt Ltd",
    adminEmail: "demo.tenantadmin.b@example.com",
    insurers: [{ code: "TATA_AIA", businessCode: "DEMO-BC-AIA-002", licenceCode: "DEMO-LIC-AIA-002" }],
  });

  const agentIds: string[] = [];
  for (const [index, agent] of agents.entries()) {
    const email = `demo.agent${index + 1}@example.com`;
    const credentials = { passwordHash, mustChangePassword: index === 3 };
    const user = await db.user.upsert({
      where: { email },
      update: credentials,
      create: { email, role: "AGENT", tenantId: tenantA.id, ...credentials },
    });
    const saved = await db.agent.upsert({
      where: { agentCode: agent.agentCode },
      update: { fullName: agent.fullName, phone: agent.phone },
      create: {
        ...agent,
        tenantId: tenantA.id,
        userId: user.id,
        address: `Demo Office ${index + 1}, ${cities[index % cities.length]![0]}`,
        joinedAt: daysAgo(400 + index * 60),
        status: index === 4 ? "INACTIVE" : "ACTIVE",
      },
    });
    agentIds.push(saved.id);
  }

  const policyRecords = [];
  for (const policy of policies) {
    policyRecords.push(
      await db.policy.upsert({
        where: { tenantId_policyCode: { tenantId: tenantA.id, policyCode: policy.policyCode } },
        update: { ...policy },
        create: { ...policy, tenantId: tenantA.id, insurerId: insurers.TATA_AIG!.id },
      }),
    );
  }

  const customerIds: string[] = [];
  for (const [index, fullName] of customerNames.entries()) {
    const [city, state] = cities[index % cities.length]!;
    const customerCode = `CUS-DEMO${String(index + 1).padStart(2, "0")}`;
    const saved = await db.customer.upsert({
      where: { customerCode },
      update: {},
      create: {
        tenantId: tenantA.id,
        customerCode,
        fullName,
        dateOfBirth: new Date(Date.UTC(1975 + index * 2, index % 12, 5 + index)),
        gender: index % 3 === 0 ? "MALE" : index % 3 === 1 ? "FEMALE" : "OTHER",
        phone: `+91 90000 10${String(index + 1).padStart(3, "0")}`,
        email: `demo.customer${index + 1}@example.com`,
        address: `${index + 10}, Demo Street`,
        city,
        state,
        nomineeName: `Demo Nominee ${index + 1}`,
        nomineeRelationship: index % 2 === 0 ? "Spouse" : "Parent",
        // Customers 1–12 spread across the 4 active agents.
        assignedAgentId: agentIds[index % 4]!,
        status: index === 11 ? "PENDING" : "ACTIVE",
      },
    });
    customerIds.push(saved.id);
  }

  // 20 sales across the last ~14 months.
  const sellable = policyRecords.filter(
    (policy) =>
      policy.status === "ACTIVE" && policy.premium !== null && policy.durationMonths !== null,
  );
  const methods: PaymentMethod[] = ["UPI", "CARD", "NET_BANKING", "CASH", "BANK_TRANSFER"];
  for (let index = 0; index < 20; index += 1) {
    const customerIndex = index % customerIds.length;
    const policy = sellable[(index * 3) % sellable.length]!;
    const issueDate = daysAgo(10 + index * 21);
    const expiryDate = addMonthsMinusDay(issueDate, policy.durationMonths!);
    const expired = expiryDate < today;

    let policyStatus: SoldPolicyStatus;
    let paymentStatus: PaymentStatus;
    if (index === 7) {
      policyStatus = "CANCELLED";
      paymentStatus = "REFUNDED";
    } else if (index % 6 === 1) {
      policyStatus = "PENDING";
      paymentStatus = "PENDING";
    } else {
      policyStatus = expired ? "EXPIRED" : "ACTIVE";
      paymentStatus = "PAID";
    }

    const policyNumber = `POL-DEMO-${String(index + 1).padStart(4, "0")}`;
    const sold = await db.soldPolicy.upsert({
      where: { policyNumber },
      update: {},
      create: {
        tenantId: tenantA.id,
        policyNumber,
        policyId: policy.id,
        customerId: customerIds[customerIndex]!,
        agentId: agentIds[customerIndex % 4]!,
        premium: policy.premium!,
        issueDate,
        expiryDate,
        paymentStatus,
        policyStatus,
      },
    });

    if (paymentStatus === "PAID" || paymentStatus === "REFUNDED") {
      const receiptNumber = `RCP-DEMO-${String(index + 1).padStart(4, "0")}`;
      await db.receipt.upsert({
        where: { receiptNumber },
        update: {},
        create: {
          tenantId: tenantA.id,
          receiptNumber,
          soldPolicyId: sold.id,
          amount: policy.premium!,
          paymentMethod: methods[index % methods.length]!,
          paymentStatus,
          issuedAt: new Date(issueDate.getTime() + 2 * 60 * 60 * 1000),
        },
      });
    }
  }

  // Tenant B: one agent, two customers and two recorded Life sales (priced on the insurer portal).
  const userB = await db.user.upsert({
    where: { email: "demo.agent.b1@example.com" },
    update: { passwordHash },
    create: {
      email: "demo.agent.b1@example.com",
      role: "AGENT",
      tenantId: tenantB.id,
      passwordHash,
      mustChangePassword: false,
    },
  });
  const agentB = await db.agent.upsert({
    where: { agentCode: "AGT-DEMOB1" },
    update: {},
    create: {
      tenantId: tenantB.id,
      userId: userB.id,
      agentCode: "AGT-DEMOB1",
      fullName: "Demo Agent Bhavna",
      phone: "+91 90000 00021",
      joinedAt: daysAgo(200),
    },
  });
  const lifePolicies = await db.policy.findMany({
    where: { tenantId: tenantB.id, insuranceType: "LIFE" },
    orderBy: { policyCode: "asc" },
    take: 2,
  });
  for (const [index, policy] of lifePolicies.entries()) {
    const customerCode = `CUS-DEMOB${index + 1}`;
    const customer = await db.customer.upsert({
      where: { customerCode },
      update: {},
      create: {
        tenantId: tenantB.id,
        customerCode,
        fullName: `Demo Customer B${index + 1}`,
        phone: `+91 90000 20${String(index + 1).padStart(3, "0")}`,
        assignedAgentId: agentB.id,
      },
    });
    const issueDate = daysAgo(30 + index * 20);
    await db.soldPolicy.upsert({
      where: { policyNumber: `POL-DEMOB-${index + 1}` },
      update: {},
      create: {
        tenantId: tenantB.id,
        policyNumber: `POL-DEMOB-${index + 1}`,
        insurerPolicyNumber: `AIA-DEMO-${1000 + index}`,
        policyId: policy.id,
        customerId: customer.id,
        agentId: agentB.id,
        premium: 25_000 + index * 5_000,
        issueDate,
        expiryDate: addMonthsMinusDay(issueDate, 12),
        paymentStatus: "PAID",
        policyStatus: "ACTIVE",
      },
    });
  }

  const counts = {
    insurers: await db.insurer.count(),
    tenants: await db.tenant.count(),
    users: await db.user.count(),
    agents: await db.agent.count(),
    customers: await db.customer.count(),
    policies: await db.policy.count(),
    soldPolicies: await db.soldPolicy.count(),
    receipts: await db.receipt.count(),
  };
  console.warn("Demo data ready:", counts);
  console.warn(
    `Demo tenant admins: demo.tenantadmin.a@example.com / demo.tenantadmin.b@example.com (same password). Tenant B agent: AGT-DEMOB1.`,
  );
  console.warn(
    `Demo agent sign-in: AGT-DEMO1 (or demo.agent1@example.com) / ${DEMO_AGENT_PASSWORD}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
