import { Router, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from './travelOrders.controller';
import { authenticate } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { generateValidation } from './travelOrders.validation';

const pdfLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });

const router = Router();

router.use(authenticate);
router.get('/generate', pdfLimiter, generateValidation, validate, ctrl.generate as unknown as RequestHandler);

export = router;
