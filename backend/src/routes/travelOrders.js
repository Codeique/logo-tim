const router = require('express').Router();
const ctrl = require('../controllers/travelOrders');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/generate', ctrl.generate);

module.exports = router;
