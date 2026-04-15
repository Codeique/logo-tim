import { Router } from 'express';
import * as ctrl from './militaryRequests.controller';
import { authenticate, authorize } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { createMilitaryRequestValidation, updateMilitaryRequestValidation } from './militaryRequests.validation';

const router = Router();

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', authorize('ADMIN', 'THERAPIST'), createMilitaryRequestValidation, validate, ctrl.create);
router.put('/:id', authorize('ADMIN', 'THERAPIST'), updateMilitaryRequestValidation, validate, ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

export = router;
