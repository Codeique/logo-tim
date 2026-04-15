import { Router } from 'express';
import * as ctrl from './evaluations.controller';
import { authenticate, authorize } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { createEvaluationValidation, updateEvaluationValidation } from './evaluations.validation';

const router = Router();

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', authorize('ADMIN', 'THERAPIST'), createEvaluationValidation, validate, ctrl.create);
router.put('/:id', authorize('ADMIN', 'THERAPIST'), updateEvaluationValidation, validate, ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

export = router;
