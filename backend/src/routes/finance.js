const router = require('express').Router();
const ctrl = require('../controllers/finance');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('ADMIN', 'THERAPIST'), ctrl.list);

module.exports = router;
