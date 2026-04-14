const router = require('express').Router();
const ctrl = require('../controllers/therapists');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', authorize('ADMIN'), ctrl.create);
router.put('/:id', authorize('ADMIN', 'THERAPIST', 'CHIEF_THERAPIST'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

module.exports = router;
