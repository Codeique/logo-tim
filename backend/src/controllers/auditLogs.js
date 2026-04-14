const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: parseInt(limit),
        include: { user: { select: { email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count(),
    ]);
    res.json({ data: logs, total });
  } catch (err) { next(err); }
};
