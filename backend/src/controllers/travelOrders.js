const PDFDocument = require('pdfkit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.generate = async (req, res, next) => {
  try {
    const { patientId, month, year } = req.query;

    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(patientId) },
      include: {
        sessions: {
          where: {
            date: {
              gte: new Date(parseInt(year), parseInt(month) - 1, 1),
              lte: new Date(parseInt(year), parseInt(month), 0),
            },
            status: 'COMPLETED',
          },
          include: { therapist: true, room: true },
          orderBy: { date: 'asc' },
        },
        militaryRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="travel-order-${patient.firstName}-${patient.lastName}-${month}-${year}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).text('PUTNI NALOG / TRAVEL ORDER', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Pacijent: ${patient.firstName} ${patient.lastName}`, { align: 'left' });
    doc.text(`Matični broj: ${patient.nationalId || 'N/A'}`);
    doc.text(`Vojni odsjek: ${patient.militaryPost || 'N/A'}`);
    doc.text(`Period: ${month}/${year}`);
    doc.moveDown();

    // Active military request
    if (patient.militaryRequests.length > 0) {
      const militaryReq = patient.militaryRequests[0];
      doc.text(`Broj zahtjeva: ${militaryReq.requestNumber}`);
      doc.text(`Vrijedi do: ${new Date(militaryReq.validUntil).toLocaleDateString('bs-BA')}`);
      doc.moveDown();
    }

    // Sessions table header
    const tableTop = doc.y;
    doc.fontSize(11).text('Datum', 50, tableTop, { continued: true, width: 100 });
    doc.text('Terapeut', 150, tableTop, { continued: true, width: 150 });
    doc.text('Soba', 300, tableTop, { continued: true, width: 100 });
    doc.text('Trajanje', 400, tableTop, { width: 100 });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    patient.sessions.forEach((session) => {
      const rowY = doc.y;
      doc.fontSize(10)
        .text(new Date(session.date).toLocaleDateString('bs-BA'), 50, rowY, { continued: true, width: 100 })
        .text(`${session.therapist.firstName} ${session.therapist.lastName}`, 150, rowY, { continued: true, width: 150 })
        .text(session.room?.name || 'N/A', 300, rowY, { continued: true, width: 100 })
        .text(`${session.duration} min`, 400, rowY, { width: 100 });
    });

    doc.moveDown(2);
    doc.text(`Ukupno sesija: ${patient.sessions.length}`, { align: 'right' });

    doc.end();
  } catch (err) { next(err); }
};
