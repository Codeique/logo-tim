import { Router } from 'express';
import * as ctrl from './users.controller';
import { authenticate, authorize } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { changePasswordValidation } from './users.validation';

const router = Router();

router.use(authenticate);
router.get('/', authorize('ADMIN'), ctrl.list);
router.post('/change-password', changePasswordValidation, validate, ctrl.changePassword);

export = router;
