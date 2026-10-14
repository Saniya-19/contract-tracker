import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Submission } from '../models/Submission.js';
import { Milestone } from '../models/Milestone.js';
import { cloudinaryConfigured } from '../config/cloudinary.js';
import { uploadBuffer, deleteFile } from '../services/storage.js';
import { addSubmissionSchema } from '../validators/submission.validators.js';

/** Maximum submissions per revision round */
const MAX_SUBMISSIONS_PER_ROUND = 10;

/**
 * Validate submission body fields (linkUrl, note) against the Zod schema.
 * Returns parsed data or throws ApiError(400).
 */
const parseSubmissionBody = (body) => {
  const result = addSubmissionSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(', ');
    throw new ApiError(400, message);
  }
  return result.data;
};

/**
 * POST /api/contracts/:id/milestones/:milestoneId/submissions
 * Add a deliverable (file upload or external link) to an in_progress milestone.
 * Freelancer only.
 */
export const addSubmission = asyncHandler(async (req, res) => {
  // ── Guard: contract must be active ────────────────────────────────
  if (req.contract.status !== 'active') {
    throw new ApiError(409, 'Submissions can only be added when the contract is active');
  }

  // ── Guard: milestone must be in_progress ──────────────────────────
  if (req.milestone.status !== 'in_progress') {
    throw new ApiError(
      409,
      `Submissions can only be added when the milestone is in_progress (current status: ${req.milestone.status})`
    );
  }

  // ── Determine submission type ─────────────────────────────────────
  const hasFile = Boolean(req.file);
  const { linkUrl, note } = parseSubmissionBody(req.body);
  const hasLink = Boolean(linkUrl);

  if (hasFile && hasLink) {
    throw new ApiError(400, 'Provide either a file or a link URL, not both');
  }
  if (!hasFile && !hasLink) {
    throw new ApiError(400, 'Provide either a file (field "file") or a link URL');
  }

  // ── Guard: file upload requires Cloudinary ────────────────────────
  if (hasFile && !cloudinaryConfigured) {
    throw new ApiError(503, 'File uploads are not configured. Set Cloudinary environment variables.');
  }

  // ── Revision round ────────────────────────────────────────────────
  const revisionRound = (req.milestone.revisionCount ?? 0) + 1;

  // ── Enforce per-round cap ─────────────────────────────────────────
  const existingCount = await Submission.countDocuments({
    milestone: req.milestone._id,
    revisionRound,
  });
  if (existingCount >= MAX_SUBMISSIONS_PER_ROUND) {
    throw new ApiError(
      409,
      `Maximum ${MAX_SUBMISSIONS_PER_ROUND} submissions allowed per revision round`
    );
  }

  // ── Build submission document ─────────────────────────────────────
  const submissionData = {
    contract: req.contract._id,
    milestone: req.milestone._id,
    submittedBy: req.user._id,
    revisionRound,
    note: note || undefined,
  };

  if (hasFile) {
    const folder = `contract-tracker/${req.contract._id}/${req.milestone._id}`;
    const { url, publicId, resourceType } = await uploadBuffer(req.file.buffer, {
      folder,
      originalName: req.file.originalname,
    });

    submissionData.type = 'file';
    submissionData.fileUrl = url;
    submissionData.publicId = publicId;
    submissionData.resourceType = resourceType;
    submissionData.originalName = req.file.originalname;
    submissionData.mimeType = req.file.mimetype;
    submissionData.size = req.file.size;
  } else {
    submissionData.type = 'link';
    submissionData.linkUrl = linkUrl;
  }

  const submission = await Submission.create(submissionData);

  res.status(201).json({
    success: true,
    data: submission,
  });
});

/**
 * GET /api/contracts/:id/milestones/:milestoneId/submissions
 * List all submissions for the milestone (any contract participant).
 * Newest first, grouped by revisionRound.
 */
export const listSubmissions = asyncHandler(async (req, res) => {
  const submissions = await Submission.find({ milestone: req.milestone._id })
    .populate('submittedBy', 'name')
    .sort({ revisionRound: -1, createdAt: -1 });

  // Group by revisionRound for convenient client consumption
  const grouped = {};
  for (const sub of submissions) {
    const round = sub.revisionRound;
    if (!grouped[round]) grouped[round] = [];
    grouped[round].push(sub);
  }

  res.status(200).json({
    success: true,
    data: submissions,
    grouped,
  });
});

/**
 * DELETE /api/contracts/:id/milestones/:milestoneId/submissions/:submissionId
 * Delete a submission (the freelancer who created it only).
 * Allowed only while milestone is in_progress and only for the current revision round.
 * Also deletes the Cloudinary asset (ignores "not found" errors).
 */
export const deleteSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  if (!mongoose.isValidObjectId(submissionId)) {
    throw new ApiError(404, 'Submission not found');
  }

  const submission = await Submission.findById(submissionId);
  if (!submission || !submission.milestone.equals(req.milestone._id)) {
    throw new ApiError(404, 'Submission not found');
  }

  // ── Guard: only the uploader can delete ──────────────────────────
  if (!submission.submittedBy.equals(req.user._id)) {
    throw new ApiError(403, 'Access denied: you did not create this submission');
  }

  // ── Guard: milestone must be in_progress ──────────────────────────
  if (req.milestone.status !== 'in_progress') {
    throw new ApiError(
      409,
      `Submissions can only be deleted when the milestone is in_progress (current status: ${req.milestone.status})`
    );
  }

  // ── Guard: only current revision round ───────────────────────────
  const currentRound = (req.milestone.revisionCount ?? 0) + 1;
  if (submission.revisionRound !== currentRound) {
    throw new ApiError(
      409,
      `Cannot delete a submission from a previous revision round (round ${submission.revisionRound})`
    );
  }

  // ── Delete Cloudinary asset if applicable ─────────────────────────
  if (submission.type === 'file' && submission.publicId) {
    await deleteFile(submission.publicId, submission.resourceType || 'auto');
  }

  await submission.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Submission deleted successfully',
  });
});
