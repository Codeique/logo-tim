const router = require('express').Router();
const ctrl = require('../controllers/militaryRequests');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', authorize('ADMIN', 'THERAPIST'), ctrl.create);
router.put('/:id', authorize('ADMIN', 'THERAPIST'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

module.exports = router;
