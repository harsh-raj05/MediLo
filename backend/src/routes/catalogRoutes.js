import { Router } from 'express';
import * as catalogController from '../controllers/catalogController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createCategorySchema, createMedicineSchema, updateMedicineSchema } from '../validators/schemas.js';

const router = Router();

router.get('/categories', catalogController.listCategories);
router.post('/categories', authenticate, authorize('admin'), validate(createCategorySchema), catalogController.createCategory);

router.get('/medicines', optionalAuth, catalogController.listMedicines);
router.get('/medicines/:id', optionalAuth, catalogController.getMedicine);
router.post('/medicines', authenticate, authorize('admin'), validate(createMedicineSchema), catalogController.createMedicine);
router.patch('/medicines/:id', authenticate, authorize('admin'), validate(updateMedicineSchema), catalogController.updateMedicine);

export default router;
