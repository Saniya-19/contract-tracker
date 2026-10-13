import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Milestone } from '../models/Milestone.js';
import { assertMilestoneTransition } from '../utils/milestoneStateMachine.js';
import { checkAndCompleteContract } from '../services/contractCompletion.js';

/**
 * Helper to determine a user's participant role on a contract
 * (freelancer id matches, client matches by id or email).
 */
export const getParticipantRole = (contract, user) => {
  if (contract.freelancer && contract.freelancer.equals(user._id)) {
    return 'freelancer';
  }
  const isClientById = contract.client && contract.client.equals(user._id);
  const isClientByEmail =
    contract.clientEmail &&
    contract.clientEmail.toLowerCase() === user.email?.toLowerCase();

  if (isClientById || isClientByEmail) {
    return 'client';
  }
  return 'unknown';
};

/**
 * Helper to convert monetary amount into integer paise to prevent floating-point inaccuracies
 */
const toPaise = (num) => Math.round(num * 100);

/**
 * Create a new milestone (Freelancer only, contract must be 'draft')
 * order = last + 1
 */
export const createMilestone = asyncHandler(async (req, res) => {
  if (!req.contract.freelancer.equals(req.user._id)) {
    throw new ApiError(403, 'Access denied: only the contract freelancer can perform this action');
  }

  if (req.contract.status !== 'draft') {
    throw new ApiError(409, 'Milestones can only be added while contract is in draft status');
  }

  const existingMilestones = await Milestone.find({ contract: req.contract._id });
  const currentTotalPaise = existingMilestones.reduce(
    (sum, m) => sum + toPaise(m.amount),
    0
  );
  const contractTotalPaise = toPaise(req.contract.totalAmount);
  const newAmountPaise = toPaise(req.body.amount);

  if (currentTotalPaise + newAmountPaise > contractTotalPaise) {
    const remainingPaise = Math.max(0, contractTotalPaise - currentTotalPaise);
    const remainingFormatted = (remainingPaise / 100).toFixed(2);
    throw new ApiError(
      400,
      `Milestone amount (${req.body.amount}) exceeds remaining contract balance (${remainingFormatted})`
    );
  }

  // Calculate order: position at last + 1
  const lastMilestone = await Milestone.findOne({ contract: req.contract._id }).sort({
    order: -1,
  });
  const order = lastMilestone ? lastMilestone.order + 1 : 1;

  const milestone = await Milestone.create({
    ...req.body,
    amount: req.body.amount,
    contract: req.contract._id,
    order,
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    data: milestone,
  });
});

/**
 * List milestones for a contract sorted by order (Any contract participant)
 */
export const listMilestones = asyncHandler(async (req, res) => {
  const milestones = await Milestone.find({ contract: req.contract._id }).sort({ order: 1 });

  res.status(200).json({
    success: true,
    data: milestones,
  });
});

/**
 * Reorder milestones (Freelancer only, contract must be 'draft')
 * Expects body { order: [ids] } containing exactly all milestones of the contract
 */
export const reorderMilestones = asyncHandler(async (req, res) => {
  if (!req.contract.freelancer.equals(req.user._id)) {
    throw new ApiError(403, 'Access denied: only the contract freelancer can perform this action');
  }

  if (req.contract.status !== 'draft') {
    throw new ApiError(409, 'Milestones can only be reordered while contract is in draft status');
  }

  const { order: requestedOrderIds } = req.body;
  const existingMilestones = await Milestone.find({ contract: req.contract._id });

  if (requestedOrderIds.length !== existingMilestones.length) {
    throw new ApiError(
      400,
      `Reorder array must contain exactly all ${existingMilestones.length} milestone IDs for this contract`
    );
  }

  const existingIdSet = new Set(existingMilestones.map((m) => m._id.toString()));
  const incomingIdSet = new Set(requestedOrderIds);

  if (incomingIdSet.size !== requestedOrderIds.length) {
    throw new ApiError(400, 'Reorder array must not contain duplicate milestone IDs');
  }

  for (const id of requestedOrderIds) {
    if (!existingIdSet.has(id)) {
      throw new ApiError(
        400,
        `Milestone ID '${id}' does not belong to this contract or does not exist`
      );
    }
  }

  // To prevent unique compound index { contract, order } collisions during intermediate updates,
  // we first temporarily shift orders to negative indices, then assign final 1-based positions.
  for (let i = 0; i < requestedOrderIds.length; i++) {
    await Milestone.findByIdAndUpdate(requestedOrderIds[i], {
      order: -(i + 1),
    });
  }

  for (let i = 0; i < requestedOrderIds.length; i++) {
    await Milestone.findByIdAndUpdate(requestedOrderIds[i], {
      order: i + 1,
    });
  }

  const updatedMilestones = await Milestone.find({ contract: req.contract._id }).sort({
    order: 1,
  });

  res.status(200).json({
    success: true,
    data: updatedMilestones,
  });
});

/**
 * Update milestone details (Freelancer only, contract must be 'draft')
 */
export const updateMilestone = asyncHandler(async (req, res) => {
  if (!req.contract.freelancer.equals(req.user._id)) {
    throw new ApiError(403, 'Access denied: only the contract freelancer can perform this action');
  }

  if (req.contract.status !== 'draft') {
    throw new ApiError(409, 'Milestones can only be updated while contract is in draft status');
  }

  if (req.body.amount !== undefined) {
    const existingMilestones = await Milestone.find({
      contract: req.contract._id,
      _id: { $ne: req.milestone._id },
    });
    const otherMilestonesPaise = existingMilestones.reduce(
      (sum, m) => sum + toPaise(m.amount),
      0
    );
    const contractTotalPaise = toPaise(req.contract.totalAmount);
    const newAmountPaise = toPaise(req.body.amount);

    if (otherMilestonesPaise + newAmountPaise > contractTotalPaise) {
      const remainingPaise = Math.max(0, contractTotalPaise - otherMilestonesPaise);
      const remainingFormatted = (remainingPaise / 100).toFixed(2);
      throw new ApiError(
        400,
        `Milestone amount (${req.body.amount}) exceeds remaining contract balance (${remainingFormatted})`
      );
    }
  }

  Object.assign(req.milestone, req.body);
  await req.milestone.save();

  res.status(200).json({
    success: true,
    data: req.milestone,
  });
});

/**
 * Delete milestone and re-number remaining milestone orders (Freelancer only, contract must be 'draft')
 */
export const deleteMilestone = asyncHandler(async (req, res) => {
  if (!req.contract.freelancer.equals(req.user._id)) {
    throw new ApiError(403, 'Access denied: only the contract freelancer can perform this action');
  }

  if (req.contract.status !== 'draft') {
    throw new ApiError(409, 'Milestones can only be deleted while contract is in draft status');
  }

  const contractId = req.contract._id;
  await req.milestone.deleteOne();

  // Renumber remaining milestones in order to keep 1-based sequential ordering
  const remaining = await Milestone.find({ contract: contractId }).sort({ order: 1 });
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].order !== i + 1) {
      await Milestone.findByIdAndUpdate(remaining[i]._id, { order: i + 1 });
    }
  }

  res.status(200).json({
    success: true,
    message: 'Milestone deleted successfully',
  });
});

/**
 * Start milestone (Freelancer only, contract must be 'active')
 * Allowed from 'pending' or 'revision_requested' -> 'in_progress'
 * Sequential rule: all earlier milestones (lower order) must be 'approved' or 'paid'.
 */
export const startMilestone = asyncHandler(async (req, res) => {
  if (req.contract.status !== 'active') {
    throw new ApiError(409, 'Milestone workflow actions are only allowed when contract is active');
  }

  const userRole = getParticipantRole(req.contract, req.user);
  assertMilestoneTransition(req.milestone, 'start', userRole);

  // Sequential rule: all earlier milestones (order < current) must be approved or paid
  const earlierIncomplete = await Milestone.findOne({
    contract: req.contract._id,
    order: { $lt: req.milestone.order },
    status: { $nin: ['approved', 'paid'] },
  }).sort({ order: 1 });

  if (earlierIncomplete) {
    throw new ApiError(
      409,
      `Cannot start milestone #${req.milestone.order} ("${req.milestone.title}") because earlier milestone #${earlierIncomplete.order} ("${earlierIncomplete.title}") is in '${earlierIncomplete.status}' status. All earlier milestones must be approved or paid first.`
    );
  }

  // Atomic update: filter includes expected current status
  const updatedMilestone = await Milestone.findOneAndUpdate(
    {
      _id: req.milestone._id,
      contract: req.contract._id,
      status: req.milestone.status,
    },
    {
      $set: {
        status: 'in_progress',
        startedAt: new Date(),
        revisionNotes: null, // Clear revision notes upon restart
      },
    },
    { new: true }
  );

  if (!updatedMilestone) {
    throw new ApiError(
      409,
      'Milestone status was modified concurrently. Please refresh and try again.'
    );
  }

  // TODO Phase 6: write activity log

  res.status(200).json({
    success: true,
    data: updatedMilestone,
  });
});

/**
 * Submit milestone (Freelancer only, contract must be 'active')
 * Allowed from 'in_progress' -> 'submitted'
 */
export const submitMilestone = asyncHandler(async (req, res) => {
  if (req.contract.status !== 'active') {
    throw new ApiError(409, 'Milestone workflow actions are only allowed when contract is active');
  }

  const userRole = getParticipantRole(req.contract, req.user);
  assertMilestoneTransition(req.milestone, 'submit', userRole);

  // TODO Phase 5: require at least one submission (file or link)

  const updateFields = {
    status: 'submitted',
    submittedAt: new Date(),
  };

  if (req.body.submissionNote !== undefined) {
    updateFields.submissionNote = req.body.submissionNote;
  }

  // Atomic update: filter includes expected current status
  const updatedMilestone = await Milestone.findOneAndUpdate(
    {
      _id: req.milestone._id,
      contract: req.contract._id,
      status: req.milestone.status,
    },
    {
      $set: updateFields,
    },
    { new: true }
  );

  if (!updatedMilestone) {
    throw new ApiError(
      409,
      'Milestone status was modified concurrently. Please refresh and try again.'
    );
  }

  // TODO Phase 6: write activity log

  res.status(200).json({
    success: true,
    data: updatedMilestone,
  });
});

/**
 * Approve milestone (Client only, contract must be 'active')
 * Allowed from 'submitted' -> 'approved'
 */
export const approveMilestone = asyncHandler(async (req, res) => {
  if (req.contract.status !== 'active') {
    throw new ApiError(409, 'Milestone workflow actions are only allowed when contract is active');
  }

  const userRole = getParticipantRole(req.contract, req.user);
  assertMilestoneTransition(req.milestone, 'approve', userRole);

  // Atomic update: filter includes expected current status ('submitted')
  const updatedMilestone = await Milestone.findOneAndUpdate(
    {
      _id: req.milestone._id,
      contract: req.contract._id,
      status: req.milestone.status,
    },
    {
      $set: {
        status: 'approved',
        approvedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!updatedMilestone) {
    throw new ApiError(
      409,
      'Milestone status was modified concurrently. Please refresh and try again.'
    );
  }

  // TODO Phase 6: write activity log

  res.status(200).json({
    success: true,
    data: updatedMilestone,
  });
});

/**
 * Request revision for a submitted milestone (Client only, contract must be 'active')
 * Allowed from 'submitted' -> 'revision_requested'
 * Requires non-empty revisionNotes (min 5 chars)
 */
export const requestRevisionMilestone = asyncHandler(async (req, res) => {
  if (req.contract.status !== 'active') {
    throw new ApiError(409, 'Milestone workflow actions are only allowed when contract is active');
  }

  const userRole = getParticipantRole(req.contract, req.user);
  assertMilestoneTransition(req.milestone, 'request-revision', userRole);

  // Atomic update: filter includes expected current status ('submitted')
  const updatedMilestone = await Milestone.findOneAndUpdate(
    {
      _id: req.milestone._id,
      contract: req.contract._id,
      status: req.milestone.status,
    },
    {
      $set: {
        status: 'revision_requested',
        revisionNotes: req.body.revisionNotes,
      },
    },
    { new: true }
  );

  if (!updatedMilestone) {
    throw new ApiError(
      409,
      'Milestone status was modified concurrently. Please refresh and try again.'
    );
  }

  // TODO Phase 6: write activity log

  res.status(200).json({
    success: true,
    data: updatedMilestone,
  });
});

/**
 * Mark milestone as paid (Client only, contract must be 'active')
 * Allowed from 'approved' -> 'paid'
 * Accepts optional paymentReference
 * Triggers automatic contract completion if all contract milestones are now paid.
 */
export const markPaidMilestone = asyncHandler(async (req, res) => {
  if (req.contract.status !== 'active') {
    throw new ApiError(409, 'Milestone workflow actions are only allowed when contract is active');
  }

  const userRole = getParticipantRole(req.contract, req.user);
  assertMilestoneTransition(req.milestone, 'mark-paid', userRole);

  const updateFields = {
    status: 'paid',
    paidAt: new Date(),
  };

  if (req.body.paymentReference !== undefined) {
    updateFields.paymentReference = req.body.paymentReference;
  }

  // Atomic update: filter includes expected current status ('approved')
  const updatedMilestone = await Milestone.findOneAndUpdate(
    {
      _id: req.milestone._id,
      contract: req.contract._id,
      status: req.milestone.status,
    },
    {
      $set: updateFields,
    },
    { new: true }
  );

  if (!updatedMilestone) {
    throw new ApiError(
      409,
      'Milestone status was modified concurrently. Please refresh and try again.'
    );
  }

  // TODO Phase 6: write activity log

  // Check and automatically complete contract if all milestones are paid
  await checkAndCompleteContract(req.contract._id);

  res.status(200).json({
    success: true,
    data: updatedMilestone,
  });
});
