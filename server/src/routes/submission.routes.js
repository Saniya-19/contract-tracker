import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { loadContract } from '../middleware/loadContract.js';
import { loadMilestone } from '../middleware/loadMilestone.js';
import { upload } from '../middleware/upload.js';
import { ApiError } from '../utils/ApiError.js';
import {
  addSubmission,
  listSubmissions,
  deleteSubmission,
} from '../controllers/submission.controller.js';

const router = Router({ mergeParams: true });

// All submission routes require authentication, a valid contract, and a valid milestone
router.use(authenticate, loadContract, loadMilestone);

/**
 * Inline middleware: ensures current user is the contract freelancer.
 * Runs BEFORE multer so unauthorized users never cause the server to buffer large files.
 */
const requireFreelancer = (req, res, next) => {
  if (!req.contract.freelancer || !req.contract.freelancer.equals(req.user._id)) {
    throw new ApiError(403, 'Access denied: only the contract freelancer can perform this action');
  }
  next();
};

// POST /  – add a submission (freelancer; auth/status checks before multer)
router.post('/', requireFreelancer, upload.single('file'), addSubmission);

// GET /   – list all submissions (any participant)
router.get('/', listSubmissions);

// DELETE /:submissionId – delete a submission (freelancer who uploaded it)
router.delete('/:submissionId', requireFreelancer, deleteSubmission);

export default router;
