import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
} from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';

const router = Router();

// Stricter rate limiter for login route: 10 requests per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  },
});

// Authentication endpoints
router.post('/register', validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// TODO: Temporary test route for verifying RBAC. Remove before production release.
router.get('/freelancer-only', authenticate, authorizeRoles('freelancer'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Freelancer access granted',
    user: req.user,
  });
});

export default router;
