const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const auditLog = (entity, action) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (req.user && res.statusCode >= 200 && res.statusCode < 300) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            entity,
            entityId: data?.id || (req.params?.id ? parseInt(req.params.id) : null),
            newValue: data || null,
          },
        });
      } catch (e) { /* silent */ }
    }
    return originalJson(data);
  };
  next();
};

module.exports = { auditLog };
