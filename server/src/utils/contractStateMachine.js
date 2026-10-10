import { ApiError } from './ApiError.js';

export const CONTRACT_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

export const CONTRACT_TRANSITIONS = {
  draft: ['pending', 'cancelled'],
  pending: ['active', 'rejected', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};

/**
 * Asserts whether a contract transition from the current status to a target status is valid.
 * Throws an ApiError(409) if the transition is disallowed.
 *
 * @param {string} from - Current contract status
 * @param {string} to - Target contract status
 */
export const assertTransition = (from, to) => {
  const allowed = CONTRACT_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new ApiError(409, `Cannot change contract from ${from} to ${to}`);
  }
};
