import { Router } from 'express';
import * as purchaseController from '../controllers/purchaseController.js';
import { authenticate } from '../middleware/auth.js';
import { enforceIdempotency } from '../middleware/idempotency.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createPurchaseSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate, authorize('admin', 'pharmacist'));
router.get('/', purchaseController.listPurchases);
router.get('/:id', purchaseController.getPurchase);
router.post('/', enforceIdempotency, validate(createPurchaseSchema), purchaseController.createPurchase);

export default router;
