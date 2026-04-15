import { Router } from 'express';
import * as ctrl from './auth.controller';
import { authenticate } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { loginValidation, refreshValidation } from './auth.validation';

const router = Router();

router.post('/login', loginValidation, validate, ctrl.login);
router.post('/refresh', refreshValidation, validate, ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);

export = router;
