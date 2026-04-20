import { Router } from 'express';
import * as ctrl from './patients.controller';
import { authenticate, authorize } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { createPatientValidation, updatePatientValidation } from './patients.validation';

const router = Router();

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/me', ctrl.getMe);
router.get('/:id', ctrl.getById);
router.post('/', authorize('ADMIN', 'THERAPIST'), createPatientValidation, validate, ctrl.create);
router.put('/:id', authorize('ADMIN', 'THERAPIST'), updatePatientValidation, validate, ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);
router.patch('/:id/toggle-active', authorize('ADMIN'), ctrl.toggleActive);

export = router;
