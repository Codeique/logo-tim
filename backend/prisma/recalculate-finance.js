/**
 * One-time script: recalculate all Finance records using the fixed per-session
 * earning rule (therapistEarning = therapist.hourlyRate, no duration factor).
 *
 * Run from backend/: node prisma/recalculate-finance.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const records = await prisma.finance.findMany({
    include: {
      session: { include: { patient: true } },
      therapist: true,
    },
  });

  let updated = 0;

  for (const record of records) {
    const therapistEarning = parseFloat(record.therapist.hourlyRate);
    const sessionPrice = parseFloat(record.session.patient.sessionPrice);
    const companyIncome = Math.max(sessionPrice - therapistEarning, 0);

    await prisma.finance.update({
      where: { id: record.id },
      data: { therapistEarning, companyIncome },
    });

    updated++;
    console.log(
      `Finance #${record.id} (session #${record.sessionId}): ` +
      `therapistEarning=${therapistEarning}, companyIncome=${companyIncome}`
    );
  }

  console.log(`\nDone. Updated ${updated} Finance record(s).`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
