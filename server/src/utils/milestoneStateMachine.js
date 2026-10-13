import { ApiError } from './ApiError.js';

export const MILESTONE_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  REVISION_REQUESTED: 'revision_requested',
  APPROVED: 'approved',
  PAID: 'paid',
};

/**
 * Milestone state machine transitions table.
 * Each entry defines { action, from, to, allowedRole }.
 */
export const MILESTONE_TRANSITIONS = [
  { action: 'start', from: 'pending', to: 'in_progress', allowedRole: 'freelancer' },
  { action: 'start', from: 'revision_requested', to: 'in_progress', allowedRole: 'freelancer' },
  { action: 'submit', from: 'in_progress', to: 'submitted', allowedRole: 'freelancer' },
  { action: 'approve', from: 'submitted', to: 'approved', allowedRole: 'client' },
  { action: 'request-revision', from: 'submitted', to: 'revision_requested', allowedRole: 'client' },
  { action: 'mark-paid', from: 'approved', to: 'paid', allowedRole: 'client' },
];

/**
 * Asserts whether a milestone transition is valid for the current milestone status,
 * requested action, and participant role.
 *
 * Throws:
 * - ApiError(403) for the wrong role
 * - ApiError(409) for an invalid status transition
 *
 * @param {Object} milestone - Milestone document or object with current status
 * @param {string} action - Workflow action (start, submit, approve, request-revision, mark-paid)
 * @param {string} userRole - Participant role ("freelancer" or "client")
 * @returns {Object} The valid transition rule { action, from, to, allowedRole }
 */
export const assertMilestoneTransition = (milestone, action, userRole) => {
  const actionTransitions = MILESTONE_TRANSITIONS.filter((entry) => entry.action === action);

  if (actionTransitions.length === 0) {
    throw new ApiError(400, `Unknown milestone action: ${action}`);
  }

  // Verify role permission first
  const expectedRole = actionTransitions[0].allowedRole;
  if (userRole !== expectedRole) {
    throw new ApiError(403, `Access denied: only ${expectedRole} can perform action '${action}'`);
  }

  // Verify that current milestone status allows this transition
  const transition = actionTransitions.find((entry) => entry.from === milestone.status);
  if (!transition) {
    const allowedFromStatuses = actionTransitions.map((t) => `'${t.from}'`).join(', ');
    throw new ApiError(
      409,
      `Cannot perform action '${action}' on milestone with status '${milestone.status}'. Allowed statuses: ${allowedFromStatuses}`
    );
  }

  return transition;
};

export default {
  MILESTONE_STATUSES,
  MILESTONE_TRANSITIONS,
  assertMilestoneTransition,
};
