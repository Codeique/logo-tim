const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.auditLog.deleteMany();
  await prisma.finance.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.militaryRequest.deleteMany();
  await prisma.session.deleteMany();
  await prisma.room.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.therapist.deleteMany();
  await prisma.user.deleteMany();

  const hash = async (p) => bcrypt.hash(p, 12);

  // Admin user
  const adminUser = await prisma.user.create({
    data: { email: 'admin@test.com', password: await hash('123456'), role: 'ADMIN' },
  });

  // Rooms
  const rooms = await Promise.all([
    prisma.room.create({ data: { name: 'Sala 1' } }),
    prisma.room.create({ data: { name: 'Sala 2' } }),
    prisma.room.create({ data: { name: 'Sala 3' } }),
    prisma.room.create({ data: { name: 'Sala 4' } }),
  ]);

  // Therapists
  const t1User = await prisma.user.create({ data: { email: 'therapist@test.com', password: await hash('123456'), role: 'THERAPIST' } });
  const t2User = await prisma.user.create({ data: { email: 'therapist2@test.com', password: await hash('123456'), role: 'THERAPIST' } });
  const t3User = await prisma.user.create({ data: { email: 'therapist3@test.com', password: await hash('123456'), role: 'THERAPIST' } });

  const t1 = await prisma.therapist.create({
    data: {
      userId: t1User.id,
      firstName: 'Ana',
      lastName: 'Kovač',
      email: 'therapist@test.com',
      hourlyRate: 30,
      rooms: { connect: [{ id: rooms[0].id }, { id: rooms[1].id }] },
    },
  });
  const t2 = await prisma.therapist.create({
    data: {
      userId: t2User.id,
      firstName: 'Marko',
      lastName: 'Perić',
      email: 'therapist2@test.com',
      hourlyRate: 35,
      rooms: { connect: [{ id: rooms[1].id }, { id: rooms[2].id }] },
    },
  });
  const t3 = await prisma.therapist.create({
    data: {
      userId: t3User.id,
      firstName: 'Ivana',
      lastName: 'Horvat',
      email: 'therapist3@test.com',
      hourlyRate: 28,
      rooms: { connect: [{ id: rooms[2].id }, { id: rooms[3].id }] },
    },
  });

  // Patients
  const p1User = await prisma.user.create({ data: { email: 'patient@test.com', password: await hash('123456'), role: 'PATIENT' } });

  const patientData = [
    { firstName: 'Luka', lastName: 'Babić', nickname: 'Luky', phone: '061-111-111', diagnosis: 'Mucanje', sessionPrice: 50, therapistId: t1.id, userId: p1User.id },
    { firstName: 'Sara', lastName: 'Novak', nickname: 'Sari', phone: '061-222-222', diagnosis: 'Dislalija', sessionPrice: 50, therapistId: t1.id },
    { firstName: 'Petar', lastName: 'Jurić', phone: '062-333-333', diagnosis: 'Afazija', sessionPrice: 60, therapistId: t2.id },
    { firstName: 'Mia', lastName: 'Tomić', phone: '063-444-444', diagnosis: 'Mucanje', sessionPrice: 50, therapistId: t2.id },
    { firstName: 'Nikola', lastName: 'Đukić', phone: '064-555-555', diagnosis: 'Disfonija', sessionPrice: 55, therapistId: t2.id, isMilitary: true, nationalId: '0101990123456', insuranceHolder: 'Ministarstvo odbrane', medicalFileNumber: 'MED-2024-001', militaryPost: 'VP 1234' },
    { firstName: 'Maja', lastName: 'Stanić', phone: '065-666-666', diagnosis: 'Disleksija', sessionPrice: 55, therapistId: t3.id, isMilitary: true, nationalId: '0505985654321', insuranceHolder: 'Ministarstvo odbrane', medicalFileNumber: 'MED-2024-002', militaryPost: 'VP 5678' },
    { firstName: 'Ivan', lastName: 'Marić', phone: '061-777-777', diagnosis: 'Mucanje', sessionPrice: 50, therapistId: t3.id },
    { firstName: 'Ela', lastName: 'Puljić', phone: '062-888-888', diagnosis: 'Dislalija', sessionPrice: 50, therapistId: t1.id },
    { firstName: 'Tin', lastName: 'Bošnjak', phone: '063-999-999', diagnosis: 'Afazija', sessionPrice: 60, therapistId: t2.id },
    { firstName: 'Zara', lastName: 'Kovačević', phone: '064-000-000', diagnosis: 'Disfonija', sessionPrice: 55, therapistId: t3.id },
  ];

  const patients = [];
  for (const pd of patientData) {
    const p = await prisma.patient.create({
      data: {
        ...pd,
        accountBalance: Math.floor(Math.random() * 200),
        remainingSessions: Math.floor(Math.random() * 10),
      },
    });
    patients.push(p);
  }

  // Military requests for military patients
  const militaryPatients = patients.filter(p => p.isMilitary);
  for (const mp of militaryPatients) {
    await prisma.militaryRequest.create({
      data: {
        patientId: mp.id,
        requestNumber: `#${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}`,
        status: 'ACTIVE',
        totalSessions: 20,
        usedSessions: 8,
        validFrom: new Date('2026-01-01'),
        validUntil: new Date('2026-06-30'),
        note: 'Odobrena fizikalna terapija',
      },
    });
  }

  // Evaluations
  await prisma.evaluation.create({
    data: {
      patientId: patients[0].id,
      date: new Date('2026-01-15'),
      content: 'Pacijent pokazuje napredak u tečnosti govora. Redukovana frekvencija mucanja za 40%.',
      therapyProposal: 'Nastaviti sa trenutnim protokolom, dodati vježbe disanja.',
    },
  });

  // Sessions
  const today = new Date();
  const sessionsToCreate = [];
  const therapists = [t1, t2, t3];

  for (let i = 0; i < 25; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    const t = therapists[i % 3];
    const p = patients[i % patients.length];
    const hour = 8 + (i % 8);
    sessionsToCreate.push({
      patientId: p.id,
      therapistId: t.id,
      roomId: rooms[i % 4].id,
      date: d,
      startTime: `${String(hour).padStart(2, '0')}:00`,
      duration: 45,
      treatmentType: 'Logopedska terapija',
      status: i < 15 ? 'COMPLETED' : i < 20 ? 'SCHEDULED' : 'CANCELED',
      isPaid: i < 10,
    });
  }

  for (const sd of sessionsToCreate) {
    const session = await prisma.session.create({ data: sd });
    if (session.status === 'COMPLETED') {
      const therapist = therapists.find(t => t.id === session.therapistId);
      const patient = patients.find(p => p.id === session.patientId);
      const durationHours = session.duration / 60;
      const therapistEarning = parseFloat(therapist.hourlyRate) * durationHours;
      const companyIncome = parseFloat(patient.sessionPrice) - therapistEarning;
      await prisma.finance.create({
        data: {
          sessionId: session.id,
          therapistId: session.therapistId,
          therapistEarning,
          companyIncome: companyIncome > 0 ? companyIncome : 0,
        },
      });
    }
  }

  // Transactions
  for (let i = 0; i < 15; i++) {
    await prisma.transaction.create({
      data: {
        patientId: patients[i % patients.length].id,
        amount: [50, 100, 150, 200, 55][i % 5],
        type: i % 7 === 0 ? 'REFUND' : 'PAYMENT',
        note: `Uplata ${i + 1}`,
        createdById: adminUser.id,
      },
    });
  }

  console.log('Seed completed successfully');
  console.log('Admin: admin@test.com / 123456');
  console.log('Therapist: therapist@test.com / 123456');
  console.log('Patient: patient@test.com / 123456');
}

main().catch(console.error).finally(() => prisma.$disconnect());
