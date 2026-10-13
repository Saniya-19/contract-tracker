import { Contract } from '../models/Contract.js';
import { Milestone } from '../models/Milestone.js';
import { assertTransition } from '../utils/contractStateMachine.js';

/**
 * Checks if all milestones belonging to the given contract are "paid".
 * If so, automatically transitions the contract from "active" to "completed",
 * sets completedAt timestamp, and persists the update.
 *
 * @param {string|mongoose.Types.ObjectId} contractId - ID of the contract to check
 * @returns {Promise<Contract|null>} The updated contract if transitioned, or null/existing contract
 */
export const checkAndCompleteContract = async (contractId) => {
  const milestones = await Milestone.find({ contract: contractId });

  // A contract with no milestones cannot be automatically completed
  if (!milestones || milestones.length === 0) {
    return null;
  }

  // Check if every milestone is in "paid" status
  const allPaid = milestones.every((milestone) => milestone.status === 'paid');
  if (!allPaid) {
    return null;
  }

  const contract = await Contract.findById(contractId);
  if (!contract) {
    return null;
  }

  // Only transition if the contract is currently "active"
  if (contract.status === 'active') {
    assertTransition(contract.status, 'completed');

    contract.status = 'completed';
    contract.completedAt = new Date();
    await contract.save();

    // TODO Phase 6: write activity log
  }

  return contract;
};

export default {
  checkAndCompleteContract,
};
