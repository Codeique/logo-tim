const router = require('express').Router();
const ctrl = require('../controllers/auditLogs');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('ADMIN'), ctrl.list);

module.exports = router;
