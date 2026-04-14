const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.list = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, therapistId, page = 1, limit = 50 } = req.query;
    const where = {};

    if (dateFrom || dateTo) {
      where.session = { date: {} };
      if (dateFrom) where.session.date.gte = new Date(dateFrom);
      if (dateTo) where.session.date.lte = new Date(dateTo);
    }
    if (therapistId) where.therapistId = parseInt(therapistId);
    if (req.user.role === 'THERAPIST') {
      const t = await prisma.therapist.findUnique({ where: { userId: req.user.id } });
      if (t) where.therapistId = t.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      prisma.finance.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          session: {
            include: {
              patient: { select: { firstName: true, lastName: true } },
            },
          },
          therapist: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.finance.count({ where }),
    ]);

    // Aggregate totals
    const totals = await prisma.finance.aggregate({
      where,
      _sum: { therapistEarning: true, companyIncome: true },
    });

    res.json({ data: records, total, totals: totals._sum });
  } catch (err) { next(err); }
};
