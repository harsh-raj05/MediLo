import { Router } from 'express';
import * as returnController from '../controllers/returnController.js';
import { authenticate } from '../middleware/auth.js';
import { enforceIdempotency } from '../middleware/idempotency.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createReturnSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate, authorize('admin', 'pharmacist'));
router.get('/', returnController.listReturns);
router.post('/', enforceIdempotency, validate(createReturnSchema), returnController.createReturn);

export default router;
