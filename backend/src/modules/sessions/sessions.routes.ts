import { Router } from 'express';
import * as ctrl from './sessions.controller';
import { authenticate, authorize } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { createSessionValidation, updateSessionValidation } from './sessions.validation';

const router = Router();

router.use(authenticate);
router.get('/treatment-types', ctrl.listTreatmentTypes);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', authorize('ADMIN', 'THERAPIST'), createSessionValidation, validate, ctrl.create);
router.put('/:id', authorize('ADMIN', 'THERAPIST'), updateSessionValidation, validate, ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

export = router;
