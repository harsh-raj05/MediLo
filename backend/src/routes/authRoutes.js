import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema, updateUserAccessSchema } from '../validators/schemas.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

router.get('/users', authenticate, authorize('admin'), authController.listUsers);
router.patch('/users/:id', authenticate, authorize('admin'), validate(updateUserAccessSchema), authController.updateUserAccess);

export default router;
