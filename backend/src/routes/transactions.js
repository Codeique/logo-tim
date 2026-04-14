const router = require('express').Router();
const ctrl = require('../controllers/transactions');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', authorize('ADMIN', 'THERAPIST'), ctrl.create);

module.exports = router;
