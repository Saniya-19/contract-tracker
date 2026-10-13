import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Milestone } from '../models/Milestone.js';

/**
 * Middleware to load a milestone by :milestoneId and verify it belongs to req.contract.
 * Returns 404 if milestone does not exist, ID is invalid, or it does not belong to req.contract.
 */
export const loadMilestone = asyncHandler(async (req, res, next) => {
  const { milestoneId } = req.params;

  if (!mongoose.isValidObjectId(milestoneId)) {
    throw new ApiError(404, 'Milestone not found');
  }

  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) {
    throw new ApiError(404, 'Milestone not found');
  }

  if (!req.contract || !milestone.contract.equals(req.contract._id)) {
    throw new ApiError(404, 'Milestone not found');
  }

  req.milestone = milestone;
  next();
});

export default loadMilestone;
