import { Router } from 'express';
import {
  createContract,
  listContracts,
  getContract,
  updateContract,
  deleteContract,
  sendContract,
  acceptContract,
  rejectContract,
  cancelContract,
} from '../controllers/contract.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validate } from '../middleware/validate.js';
import { loadContract } from '../middleware/loadContract.js';
import {
  createContractSchema,
  updateContractSchema,
  rejectContractSchema,
  listContractsQuerySchema,
} from '../validators/contract.validators.js';

const router = Router();

// Protect all contract endpoints with JWT authentication
router.use(authenticate);

// Contract CRUD routes
router.post('/', authorizeRoles('freelancer'), validate(createContractSchema), createContract);
router.get('/', validate(listContractsQuerySchema, 'query'), listContracts);
router.get('/:id', loadContract, getContract);
router.patch(
  '/:id',
  authorizeRoles('freelancer'),
  loadContract,
  validate(updateContractSchema),
  updateContract
);
router.delete('/:id', authorizeRoles('freelancer'), loadContract, deleteContract);

// Contract lifecycle transition routes
router.post('/:id/send', authorizeRoles('freelancer'), loadContract, sendContract);
router.post('/:id/accept', authorizeRoles('client'), loadContract, acceptContract);
router.post(
  '/:id/reject',
  authorizeRoles('client'),
  loadContract,
  validate(rejectContractSchema),
  rejectContract
);
router.post('/:id/cancel', authorizeRoles('freelancer'), loadContract, cancelContract);

export default router;
