import { Router } from 'express';
import * as ctrl from './finance.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', authorize('ADMIN', 'THERAPIST', 'CHIEF_THERAPIST'), ctrl.list);

export = router;
