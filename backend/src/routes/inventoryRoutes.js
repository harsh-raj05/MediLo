import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import { authenticate } from '../middleware/auth.js';
import { enforceIdempotency } from '../middleware/idempotency.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { adjustStockSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate, authorize('admin', 'pharmacist'));
router.get('/batches', inventoryController.listBatches);
router.get('/alerts', inventoryController.getAlerts);
router.get('/movements', inventoryController.listMovements);
router.post('/adjustments', enforceIdempotency, validate(adjustStockSchema), inventoryController.adjustStock);

export default router;
