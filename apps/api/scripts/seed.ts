import { prisma } from "../src/db/prisma";

const BARRIER_CODES = [
  "WORK",
  "FAMILY",
  "TRANSPORT",
  "HEALTH",
  "MENTAL_HEALTH",
  "DIGITAL_LITERACY",
  "FINANCIAL",
  "IMMIGRATION_FEAR",
  "MOTIVATION",
  "OTHER",
] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("Seeding demo sessions for analytics…");

  for (let i = 0; i < 20; i++) {
    const risk = Math.floor(Math.random() * 100);
    const barrierCount = 1 + Math.floor(Math.random() * 3);
    const codes = Array.from({ length: barrierCount }, () => pick(BARRIER_CODES));

    const session = await prisma.studentSession.create({
      data: {
        studentName: `Demo Student ${i + 1}`,
        studentEmail: `student${i + 1}@example.edu`,
        language: "en",
        persona: "sofia",
        status: risk >= 60 ? "ESCALATED" : "COMPLETED",
        riskScore: risk,
        withdrawIntent: true,
        withdrawPrevented: risk < 50 && Math.random() > 0.5,
      },
    });

    for (const code of codes) {
      await prisma.barrierEvent.create({
        data: {
          sessionId: session.id,
          code,
          severity: risk >= 60 ? "HIGH" : risk >= 40 ? "MEDIUM" : "LOW",
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

