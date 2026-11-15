import { Router } from 'express';
import * as supplierController from '../controllers/supplierController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createSupplierSchema, updateSupplierSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate, authorize('admin', 'pharmacist'));
router.get('/', supplierController.listSuppliers);
router.post('/', authorize('admin'), validate(createSupplierSchema), supplierController.createSupplier);
router.patch('/:id', authorize('admin'), validate(updateSupplierSchema), supplierController.updateSupplier);

export default router;
