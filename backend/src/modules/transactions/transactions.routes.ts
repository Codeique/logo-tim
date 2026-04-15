import { Router } from 'express';
import * as ctrl from './transactions.controller';
import { authenticate, authorize } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { createTransactionValidation } from './transactions.validation';

const router = Router();

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', authorize('ADMIN', 'THERAPIST'), createTransactionValidation, validate, ctrl.create);

export = router;
