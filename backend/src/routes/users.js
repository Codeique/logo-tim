const router = require('express').Router();
const ctrl = require('../controllers/users');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('ADMIN'), ctrl.list);
router.post('/change-password', ctrl.changePassword);

module.exports = router;
