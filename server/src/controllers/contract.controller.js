import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Contract } from '../models/Contract.js';
import { Milestone } from '../models/Milestone.js';
import { User } from '../models/User.js';
import { assertTransition } from '../utils/contractStateMachine.js';

/**
 * Create a new contract (Freelancer only)
 * Initial status is always 'draft'.
 * Auto-links client if a registered client exists with clientEmail.
 */
export const createContract = asyncHandler(async (req, res) => {
  let clientId = null;
  const clientUser = await User.findOne({
    email: req.body.clientEmail.toLowerCase(),
    role: 'client',
  });
  if (clientUser) {
    clientId = clientUser._id;
  }

  const contract = await Contract.create({
    ...req.body,
    freelancer: req.user._id,
    client: clientId,
    status: 'draft',
  });

  res.status(201).json({
    success: true,
    data: contract,
  });
});

/**
 * List contracts for authenticated user
 * - Freelancer sees their own contracts.
 * - Client sees contracts where client = user id OR clientEmail = user email, excluding drafts.
 * - Supports status filter, case-insensitive title search, pagination, and sorting.
 */
export const listContracts = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 10, sort = 'newest' } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const queryConditions = [];

  // Role-based visibility
  if (req.user.role === 'freelancer') {
    queryConditions.push({ freelancer: req.user._id });
  } else if (req.user.role === 'client') {
    queryConditions.push({
      $or: [
        { client: req.user._id },
        { clientEmail: req.user.email.toLowerCase() },
      ],
    });
    // Clients must never see draft contracts
    queryConditions.push({ status: { $ne: 'draft' } });
  }

  // Filter by status if specified
  if (status) {
    queryConditions.push({ status });
  }

  // Case-insensitive search on title
  if (search && search.trim()) {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    queryConditions.push({ title: { $regex: escapedSearch, $options: 'i' } });
  }

  const finalFilter = queryConditions.length > 0 ? { $and: queryConditions } : {};

  // Sort newest first by default
  const sortOption = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

  const total = await Contract.countDocuments(finalFilter);
  const pages = Math.ceil(total / limitNum) || 1;

  const contracts = await Contract.find(finalFilter)
    .populate('freelancer', 'name email')
    .populate('client', 'name email')
    .sort(sortOption)
    .skip(skip)
    .limit(limitNum);

  res.status(200).json({
    success: true,
    data: contracts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages,
    },
  });
});

/**
 * Get single contract by ID
 * Returns contract with freelancer and client populated (name, email only).
 */
export const getContract = asyncHandler(async (req, res) => {
  const contract = await req.contract.populate([
    { path: 'freelancer', select: 'name email' },
    { path: 'client', select: 'name email' },
  ]);

  const milestones = await Milestone.find({ contract: req.contract._id }).sort({ order: 1 });

  const total = milestones.length;
  const approved = milestones.filter((m) => m.status === 'approved').length;
  const paid = milestones.filter((m) => m.status === 'paid').length;
  const completedCount = approved + paid;
  const percentComplete = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const progress = {
    total,
    approved,
    paid,
    percentComplete,
  };

  const contractData = {
    ...contract.toObject(),
    milestones,
    progress,
  };

  res.status(200).json({
    success: true,
    data: contractData,
  });
});

/**
 * Update contract (Freelancer only)
 * Allowed only while status is 'draft'.
 */
export const updateContract = asyncHandler(async (req, res) => {
  if (!req.contract.freelancer.equals(req.user._id)) {
    throw new ApiError(403, 'Access denied: only the contract freelancer can perform this action');
  }

  if (req.contract.status !== 'draft') {
    throw new ApiError(409, 'Contracts can only be updated while in draft status');
  }

  const effectiveStartDate =
    req.body.startDate !== undefined ? new Date(req.body.startDate) : req.contract.startDate;
  const effectiveEndDate =
    req.body.endDate !== undefined ? new Date(req.body.endDate) : req.contract.endDate;

  if (effectiveStartDate && effectiveEndDate && effectiveEndDate <= effectiveStartDate) {
    throw new ApiError(400, 'End date must be after start date');
  }

  // If totalAmount is being updated, verify it is not less than existing milestones sum
  if (req.body.totalAmount !== undefined) {
    const milestones = await Milestone.find({ contract: req.contract._id });
    const currentMilestonePaise = milestones.reduce(
      (sum, m) => sum + Math.round(m.amount * 100),
      0
    );
    const newTotalPaise = Math.round(req.body.totalAmount * 100);

    if (newTotalPaise < currentMilestonePaise) {
      const milestoneSumFormatted = (currentMilestonePaise / 100).toFixed(2);
      throw new ApiError(
        400,
        `Total amount cannot be less than the sum of existing milestones (${milestoneSumFormatted})`
      );
    }
  }

  // If client email was updated, re-link client user if registered
  if (
    req.body.clientEmail &&
    req.body.clientEmail.toLowerCase() !== req.contract.clientEmail.toLowerCase()
  ) {
    const clientUser = await User.findOne({
      email: req.body.clientEmail.toLowerCase(),
      role: 'client',
    });
    req.contract.client = clientUser ? clientUser._id : null;
  }

  Object.assign(req.contract, req.body);
  await req.contract.save();

  res.status(200).json({
    success: true,
    data: req.contract,
  });
});

/**
 * Delete contract (Freelancer only)
 * Allowed only while status is 'draft'.
 */
export const deleteContract = asyncHandler(async (req, res) => {
  if (!req.contract.freelancer.equals(req.user._id)) {
    throw new ApiError(403, 'Access denied: only the contract freelancer can perform this action');
  }

  if (req.contract.status !== 'draft') {
    throw new ApiError(409, 'Contracts can only be deleted while in draft status');
  }

  await req.contract.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Contract deleted successfully',
  });
});

/**
 * Send contract to client (Freelancer only)
 * Transitions from 'draft' to 'pending'.
 */
export const sendContract = asyncHandler(async (req, res) => {
  if (!req.contract.freelancer.equals(req.user._id)) {
    throw new ApiError(403, 'Access denied: only the contract freelancer can perform this action');
  }

  assertTransition(req.contract.status, 'pending');

  const milestones = await Milestone.find({ contract: req.contract._id });
  if (milestones.length === 0) {
    throw new ApiError(400, 'Contract must have at least one milestone before sending to client');
  }

  const milestoneTotalPaise = milestones.reduce(
    (sum, m) => sum + Math.round(m.amount * 100),
    0
  );
  const contractTotalPaise = Math.round(req.contract.totalAmount * 100);

  if (milestoneTotalPaise !== contractTotalPaise) {
    const milestoneSumFormatted = (milestoneTotalPaise / 100).toFixed(2);
    const contractTotalFormatted = (contractTotalPaise / 100).toFixed(2);
    throw new ApiError(
      400,
      `Milestone amounts sum (${milestoneSumFormatted}) must equal contract total amount (${contractTotalFormatted}) before sending`
    );
  }

  // TODO Phase 9: send email notification to client
  // TODO Phase 6: write activity log

  req.contract.status = 'pending';
  req.contract.sentAt = new Date();
  await req.contract.save();

  res.status(200).json({
    success: true,
    data: req.contract,
  });
});

/**
 * Accept contract (Client only)
 * Transitions from 'pending' to 'active'.
 * Links client to current user and records acceptedAt.
 */
export const acceptContract = asyncHandler(async (req, res) => {
  const isClient =
    (req.contract.client && req.contract.client.equals(req.user._id)) ||
    (req.contract.clientEmail &&
      req.contract.clientEmail.toLowerCase() === req.user.email.toLowerCase());

  if (!isClient) {
    throw new ApiError(403, 'Access denied: only the contract client can perform this action');
  }

  assertTransition(req.contract.status, 'active');

  // TODO Phase 6: write activity log

  req.contract.status = 'active';
  req.contract.client = req.user._id;
  req.contract.acceptedAt = new Date();
  await req.contract.save();

  res.status(200).json({
    success: true,
    data: req.contract,
  });
});

/**
 * Reject contract (Client only)
 * Transitions from 'pending' to 'rejected'.
 * Records rejectionReason and rejectedAt.
 */
export const rejectContract = asyncHandler(async (req, res) => {
  const isClient =
    (req.contract.client && req.contract.client.equals(req.user._id)) ||
    (req.contract.clientEmail &&
      req.contract.clientEmail.toLowerCase() === req.user.email.toLowerCase());

  if (!isClient) {
    throw new ApiError(403, 'Access denied: only the contract client can perform this action');
  }

  assertTransition(req.contract.status, 'rejected');

  // TODO Phase 6: write activity log

  req.contract.status = 'rejected';
  req.contract.rejectionReason = req.body?.rejectionReason || null;
  req.contract.rejectedAt = new Date();
  await req.contract.save();

  res.status(200).json({
    success: true,
    data: req.contract,
  });
});

/**
 * Cancel contract (Freelancer only)
 * Transitions from draft | pending | active to 'cancelled'.
 * Records cancelledAt.
 */
export const cancelContract = asyncHandler(async (req, res) => {
  if (!req.contract.freelancer.equals(req.user._id)) {
    throw new ApiError(403, 'Access denied: only the contract freelancer can perform this action');
  }

  assertTransition(req.contract.status, 'cancelled');

  // TODO Phase 6: write activity log

  req.contract.status = 'cancelled';
  req.contract.cancelledAt = new Date();
  await req.contract.save();

  res.status(200).json({
    success: true,
    data: req.contract,
  });
});
