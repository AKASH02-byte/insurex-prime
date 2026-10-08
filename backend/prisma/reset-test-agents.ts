/* eslint-disable no-console -- CLI script: console output is its interface */
/**
 * DEVELOPMENT ONLY. Deletes every agent (and their login accounts, sessions, sold
 * policies and receipts), unassigns their customers, then creates 20 fictional test
 * agents. Each starts on the default password (first 5 letters of first name + "@" +
 * phone) and must change it at first sign-in.
 *
 *   npx tsx --env-file=.env prisma/reset-test-agents.ts            # prints counts only
 *   npx tsx --env-file=.env prisma/reset-test-agents.ts --confirm  # does it
 */
import { createDatabase } from "../src/config/database.js";
import { generateDefaultAgentPassword, hashPassword } from "../src/modules/auth/password.js";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run when NODE_ENV=production.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// pool of 1: the local PGlite dev server accepts a single session at a time.
const db = createDatabase(process.env.DATABASE_URL, 1);
const confirm = process.argv.includes("--confirm");

const names = [
  "Rajesh Verma",
  "Priya Sharma",
  "Amit Patel",
  "Sneha Iyer",
  "Vikram Singh",
  "Anjali Nair",
  "Rohit Gupta",
  "Kavita Reddy",
  "Suresh Kumar",
  "Neha Joshi",
  "Arjun Mehta",
  "Pooja Desai",
  "Manish Tiwari",
  "Divya Menon",
  "Karan Malhotra",
  "Sunita Rao",
  "Deepak Chauhan",
  "Meera Pillai",
  "Sanjay Bose",
  "Ritu Agarwal",
];

const agentIds = (await db.agent.findMany({ select: { id: true } })).map((a) => a.id);
console.log({
  agents: agentIds.length,
  customersToUnassign: await db.customer.count({ where: { assignedAgentId: { in: agentIds } } }),
  soldPoliciesToDelete: await db.soldPolicy.count({ where: { agentId: { in: agentIds } } }),
});
if (!confirm) {
  console.log("Dry run. Re-run with --confirm to delete and create the 20 test agents.");
  process.exit(0);
}

const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
await db.$transaction(
  async (tx) => {
    const tenant = await tx.tenant.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
    const agents = await tx.agent.findMany({ select: { id: true, userId: true } });
    const ids = agents.map((a) => a.id);
    await tx.customer.updateMany({
      where: { assignedAgentId: { in: ids } },
      data: { assignedAgentId: null },
    });
    await tx.receipt.deleteMany({ where: { soldPolicy: { agentId: { in: ids } } } });
    await tx.soldPolicy.deleteMany({ where: { agentId: { in: ids } } });
    await tx.agentSession.deleteMany({ where: { userId: { in: agents.map((a) => a.userId) } } });
    await tx.agent.deleteMany({ where: { id: { in: ids } } });
    await tx.user.deleteMany({ where: { id: { in: agents.map((a) => a.userId) } } });

    for (const [index, fullName] of names.entries()) {
      const n = index + 1;
      const phone = `98765${String(43200 + n).padStart(5, "0")}`;
      const passwordHash = await hashPassword(generateDefaultAgentPassword(fullName, phone));
      await tx.agent.create({
        data: {
          tenant: { connect: { id: tenant.id } },
          agentCode: `AGT-T${String(n).padStart(3, "0")}`,
          fullName,
          phone,
          address: `${n} Test Street, Mumbai`,
          status: n % 9 === 0 ? "INACTIVE" : "ACTIVE",
          joinedAt: new Date(today.getTime() - n * 12 * 86_400_000),
          user: {
            create: {
              email: `test.agent${n}@example.com`,
              role: "AGENT",
              tenant: { connect: { id: tenant.id } },
              passwordHash,
              mustChangePassword: true,
            },
          },
        },
      });
    }
  },
  { timeout: 120_000 },
);
console.log(`Deleted ${agentIds.length} agents; created ${names.length} test agents.`);
process.exit(0);
