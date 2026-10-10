import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Contract } from '../models/Contract.js';

/**
 * Middleware to load a contract by :id into req.contract.
 *
 * Security & Permission Rules:
 * 1. If contract does not exist or ID is invalid, returns 404.
 * 2. If current authenticated user is not a participant (freelancer or client matched
 *    by ID or email), returns 404 so existence is not leaked.
 * 3. Clients must never see contracts in "draft" status (returns 404).
 */
export const loadContract = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Contract not found');
  }

  const contract = await Contract.findById(id);
  if (!contract) {
    throw new ApiError(404, 'Contract not found');
  }

  const userId = req.user?._id;
  const userEmail = req.user?.email?.toLowerCase();

  const isFreelancer = Boolean(contract.freelancer && contract.freelancer.equals(userId));
  const isClientById = Boolean(contract.client && contract.client.equals(userId));
  const isClientByEmail = Boolean(
    contract.clientEmail && contract.clientEmail.toLowerCase() === userEmail
  );
  const isClient = isClientById || isClientByEmail;

  // Hide contract from any non-participant to prevent leaking existence
  if (!isFreelancer && !isClient) {
    throw new ApiError(404, 'Contract not found');
  }

  // Clients must never see contracts in "draft" status
  if (!isFreelancer && contract.status === 'draft') {
    throw new ApiError(404, 'Contract not found');
  }

  req.contract = contract;
  next();
});

export default loadContract;
