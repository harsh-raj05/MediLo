import { Router } from 'express';
import authRoutes from './authRoutes.js';
import catalogRoutes from './catalogRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';
import reportRoutes from './reportRoutes.js';
import returnRoutes from './returnRoutes.js';
import saleRoutes from './saleRoutes.js';
import supplierRoutes from './supplierRoutes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', service: 'medilo-pharmacy-api', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/catalog', catalogRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', saleRoutes);
router.use('/returns', returnRoutes);
router.use('/reports', reportRoutes);

export default router;
