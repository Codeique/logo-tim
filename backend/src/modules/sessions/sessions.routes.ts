import { Router } from 'express';
import { Role } from '@prisma/client';
import * as ctrl from './sessions.controller';
import { authenticate, authorize } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { createSessionValidation, updateSessionValidation } from './sessions.validation';

const router = Router();

router.use(authenticate);
router.get('/treatment-types', ctrl.listTreatmentTypes);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', authorize(Role.ADMIN, Role.THERAPIST, Role.CHIEF_THERAPIST), createSessionValidation, validate, ctrl.create);
router.put('/:id', authorize(Role.ADMIN, Role.THERAPIST, Role.CHIEF_THERAPIST), updateSessionValidation, validate, ctrl.update);
router.delete('/:id', authorize(Role.ADMIN), ctrl.remove);

export = router;
