const router = require('express').Router();
const ctrl = require('../controllers/sessions');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', authorize('ADMIN', 'THERAPIST'), ctrl.create);
router.put('/:id', authorize('ADMIN', 'THERAPIST'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

module.exports = router;
