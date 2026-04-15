import { Router } from 'express';
import * as ctrl from './therapists.controller';
import { authenticate, authorize } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { createTherapistValidation, updateTherapistValidation } from './therapists.validation';

const router = Router();

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', authorize('ADMIN'), createTherapistValidation, validate, ctrl.create);
router.put('/:id', authorize('ADMIN', 'THERAPIST', 'CHIEF_THERAPIST'), updateTherapistValidation, validate, ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

export = router;
