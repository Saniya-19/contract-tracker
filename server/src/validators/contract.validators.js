import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * Validates MongoDB ObjectId format
 */
const objectIdSchema = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid contract ID format',
});

/**
 * Schema for route parameters with an ObjectId :id
 */
export const contractIdParamSchema = z.object({
  id: objectIdSchema,
});

/**
 * Schema for creating a new contract (freelancer only)
 */
export const createContractSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(3, 'Title must be at least 3 characters long')
      .max(100, 'Title cannot exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional(),
    clientEmail: z
      .string({ required_error: 'Client email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid client email address'),
    totalAmount: z.coerce
      .number({ required_error: 'Total amount is required' })
      .min(1, 'Total amount must be at least 1'),
    currency: z
      .string()
      .trim()
      .min(1, 'Currency cannot be empty')
      .max(10, 'Currency code cannot exceed 10 characters')
      .optional()
      .default('INR'),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

/**
 * Schema for updating an existing draft contract (freelancer only)
 * All fields are optional.
 */
export const updateContractSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters long')
      .max(100, 'Title cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional(),
    clientEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid client email address')
      .optional(),
    totalAmount: z.coerce
      .number()
      .min(1, 'Total amount must be at least 1')
      .optional(),
    currency: z
      .string()
      .trim()
      .min(1, 'Currency cannot be empty')
      .max(10, 'Currency code cannot exceed 10 characters')
      .optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

/**
 * Schema for rejecting a pending contract (client only)
 */
export const rejectContractSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .max(500, 'Rejection reason cannot exceed 500 characters')
    .optional(),
});

/**
 * Schema for listing contracts query parameters
 */
export const listContractsQuerySchema = z.object({
  status: z
    .enum(['draft', 'pending', 'active', 'completed', 'rejected', 'cancelled'], {
      errorMap: () => ({
        message: 'Status must be one of: draft, pending, active, completed, rejected, cancelled',
      }),
    })
    .optional(),
  search: z.string().trim().optional(),
  page: z.coerce
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10),
  sort: z.string().trim().optional().default('newest'),
});
