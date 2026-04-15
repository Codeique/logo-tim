import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { Role } from '@prisma/client';
import prisma from '../../lib/prisma';
import logger from '../../lib/logger';

interface TravelOrderQuery {
  patientId: string;
  month: string;
  year: string;
}

export const generate = async (req: Request<{}, {}, {}, TravelOrderQuery>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId, month, year } = req.query;

    // Ownership check: patients may only request their own travel orders (BUG-10 fix)
    if (req.user.role === Role.PATIENT) {
      const p = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      if (!p || p.id !== parseInt(patientId)) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
    }

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

    if (!patient) { res.status(404).json({ message: 'Patient not found' }); return; }

    logger.info('PDF generated', { patientId: parseInt(patientId), month, year, requestId: req.requestId });
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Sanitize filename to prevent header injection (SEC-03 fix)
    const safeName = `${patient.firstName}-${patient.lastName}`.replace(/[^a-zA-Z0-9-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="travel-order-${safeName}-${month}-${year}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).text('PUTNI NALOG / TRAVEL ORDER', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Pacijent: ${patient.firstName} ${patient.lastName}`, { align: 'left' });
    doc.text(`Matični broj: ${patient.nationalId || 'N/A'}`);
    doc.text(`Vojni odsjek: ${patient.militaryPost || 'N/A'}`);
    doc.text(`Period: ${month}/${year}`);
    doc.moveDown();

    if (patient.militaryRequests.length > 0) {
      const militaryReq = patient.militaryRequests[0];
      doc.text(`Broj zahtjeva: ${militaryReq.requestNumber}`);
      doc.text(`Vrijedi do: ${new Date(militaryReq.validUntil).toLocaleDateString('bs-BA')}`);
      doc.moveDown();
    }

    const tableTop = doc.y;
    doc.fontSize(11).text('Datum', 50, tableTop, { continued: true, width: 100 });
    doc.text('Terapeut', 150, tableTop, { continued: true, width: 150 });
    doc.text('Soba', 300, tableTop, { continued: true, width: 100 });
    doc.text('Trajanje', 400, tableTop, { width: 100 });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    for (const session of patient.sessions) {
      const rowY = doc.y;
      doc.fontSize(10)
        .text(new Date(session.date).toLocaleDateString('bs-BA'), 50, rowY, { continued: true, width: 100 })
        .text(`${session.therapist.firstName} ${session.therapist.lastName}`, 150, rowY, { continued: true, width: 150 })
        .text(session.room?.name || 'N/A', 300, rowY, { continued: true, width: 100 })
        .text(`${session.duration} min`, 400, rowY, { width: 100 });
    }

    doc.moveDown(2);
    doc.text(`Ukupno sesija: ${patient.sessions.length}`, { align: 'right' });
    doc.end();
  } catch (err) { next(err); }
};
