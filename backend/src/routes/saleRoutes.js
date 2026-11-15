import { Router } from 'express';
import * as saleController from '../controllers/saleController.js';
import { authenticate } from '../middleware/auth.js';
import { enforceIdempotency } from '../middleware/idempotency.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createSaleSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate, authorize('admin', 'pharmacist', 'customer'));
router.get('/', saleController.listSales);
router.get('/:id', saleController.getSale);
router.post('/', enforceIdempotency, validate(createSaleSchema), saleController.createSale);

export default router;
