import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, authorize('admin', 'pharmacist'));
router.get('/sales', reportController.salesReport);
router.get('/stock-valuation', reportController.stockValuationReport);
router.get('/expiry', reportController.expiryReport);
router.get('/stock-reconciliation', reportController.stockReconciliationReport);
router.get('/audit-logs', authorize('admin'), reportController.auditLogs);

export default router;
