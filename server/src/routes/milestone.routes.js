import { Router } from 'express';
import {
  createMilestone,
  listMilestones,
  reorderMilestones,
  updateMilestone,
  deleteMilestone,
  startMilestone,
  submitMilestone,
  approveMilestone,
  requestRevisionMilestone,
  markPaidMilestone,
} from '../controllers/milestone.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loadContract } from '../middleware/loadContract.js';
import { loadMilestone } from '../middleware/loadMilestone.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createMilestoneSchema,
  updateMilestoneSchema,
  reorderMilestonesSchema,
  requestRevisionSchema,
  submitMilestoneSchema,
  markPaidMilestoneSchema,
} from '../validators/milestone.validators.js';

const router = Router({ mergeParams: true });

// Protect all milestone routes with authentication and contract loading
router.use(authenticate, loadContract);

/**
 * Middleware ensuring current user is the contract's freelancer
 */
const requireContractFreelancer = (req, res, next) => {
  if (!req.contract.freelancer || !req.contract.freelancer.equals(req.user._id)) {
    throw new ApiError(403, 'Access denied: only the contract freelancer can perform this action');
  }
  next();
};

/**
 * Middleware ensuring current user is the contract's client (by ID or email)
 */
const requireContractClient = (req, res, next) => {
  const isClientById = req.contract.client && req.contract.client.equals(req.user._id);
  const isClientByEmail =
    req.contract.clientEmail &&
    req.contract.clientEmail.toLowerCase() === req.user?.email?.toLowerCase();

  if (!isClientById && !isClientByEmail) {
    throw new ApiError(403, 'Access denied: only the contract client can perform this action');
  }
  next();
};

// Milestone CRUD & reorder routes
router.post('/', requireContractFreelancer, validate(createMilestoneSchema), createMilestone);
router.get('/', listMilestones);
router.put('/reorder', requireContractFreelancer, validate(reorderMilestonesSchema), reorderMilestones);
router.patch(
  '/:milestoneId',
  loadMilestone,
  requireContractFreelancer,
  validate(updateMilestoneSchema),
  updateMilestone
);
router.delete('/:milestoneId', loadMilestone, requireContractFreelancer, deleteMilestone);

// Milestone lifecycle workflow routes
router.post('/:milestoneId/start', loadMilestone, requireContractFreelancer, startMilestone);
router.post(
  '/:milestoneId/submit',
  loadMilestone,
  requireContractFreelancer,
  validate(submitMilestoneSchema),
  submitMilestone
);
router.post('/:milestoneId/approve', loadMilestone, requireContractClient, approveMilestone);
router.post(
  '/:milestoneId/request-revision',
  loadMilestone,
  requireContractClient,
  validate(requestRevisionSchema),
  requestRevisionMilestone
);
router.post(
  '/:milestoneId/mark-paid',
  loadMilestone,
  requireContractClient,
  validate(markPaidMilestoneSchema),
  markPaidMilestone
);

export default router;
