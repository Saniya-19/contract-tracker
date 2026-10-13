import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * Validates MongoDB ObjectId string representation
 */
export const objectIdSchema = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ID format',
});

/**
 * Validates route parameters containing contract :id and milestone :milestoneId
 */
export const milestoneParamsSchema = z.object({
  id: objectIdSchema,
  milestoneId: objectIdSchema,
});

/**
 * Schema for creating a new milestone
 */
export const createMilestoneSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  amount: z.coerce
    .number({ required_error: 'Amount is required' })
    .min(1, 'Amount must be at least 1'),
  dueDate: z.coerce.date({ required_error: 'Due date is required' }),
});

/**
 * Schema for updating an existing milestone (all fields optional)
 */
export const updateMilestoneSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(100, 'Title cannot exceed 100 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  amount: z.coerce
    .number()
    .min(1, 'Amount must be at least 1')
    .optional(),
  dueDate: z.coerce.date().optional(),
});

/**
 * Schema for reordering contract milestones
 */
export const reorderMilestonesSchema = z.object({
  order: z
    .array(objectIdSchema, { required_error: 'Order array of milestone IDs is required' })
    .min(1, 'Order must contain at least one milestone ID'),
});

/**
 * Schema for requesting revision on a submitted milestone
 */
export const requestRevisionSchema = z.object({
  revisionNotes: z
    .string({ required_error: 'Revision notes are required' })
    .trim()
    .min(5, 'Revision notes must be at least 5 characters long')
    .max(1000, 'Revision notes cannot exceed 1000 characters'),
});

/**
 * Schema for submitting a milestone deliverable
 */
export const submitMilestoneSchema = z.object({
  submissionNote: z
    .string()
    .trim()
    .max(1000, 'Submission note cannot exceed 1000 characters')
    .optional(),
});

/**
 * Schema for marking an approved milestone as paid
 */
export const markPaidMilestoneSchema = z.object({
  paymentReference: z
    .string()
    .trim()
    .max(100, 'Payment reference cannot exceed 100 characters')
    .optional(),
});
