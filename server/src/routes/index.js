import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import contractRoutes from './contract.routes.js';
import milestoneRoutes from './milestone.routes.js';
import submissionRoutes from './submission.routes.js';

const router = Router();

// Mount individual route modules
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/contracts/:id/milestones/:milestoneId/submissions', submissionRoutes);
router.use('/contracts/:id/milestones', milestoneRoutes);
router.use('/contracts', contractRoutes);

export default router;
