import { Router } from 'express';
import * as ctrl from './auditLogs.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', authorize('ADMIN'), ctrl.list);

export = router;
