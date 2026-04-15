import { Router } from 'express';
import * as ctrl from './rooms.controller';
import { authenticate, authorize } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { createRoomValidation, updateRoomValidation } from './rooms.validation';

const router = Router();

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', authorize('ADMIN'), createRoomValidation, validate, ctrl.create);
router.put('/:id', authorize('ADMIN'), updateRoomValidation, validate, ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

export = router;
