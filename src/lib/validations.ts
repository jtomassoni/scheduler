import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

/**
 * Validation schemas for the application using Zod
 */

// User validation schemas
export const userCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  role: z.nativeEnum(Role),
  hasDayJob: z.boolean().default(false),
  dayJobCutoff: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)')
    .optional()
    .nullable(),
  isLead: z.boolean().default(false),
  preferredVenuesOrder: z.array(z.string()).default([]),
});

export const userUpdateSchema = userCreateSchema.partial().extend({
  id: z.string(),
  status: z.nativeEnum(UserStatus).optional(),
  preferredVenuesOrder: z.array(z.string()).optional(),
  venueRankings: z
    .record(z.string(), z.number().int().min(1))
    .optional()
    .nullable(), // { "venueId": rankingNumber }
});

// Profile update schema (for user self-service profile updates)
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .optional(),
  hasDayJob: z.boolean().optional(),
  dayJobCutoff: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)')
    .optional()
    .nullable(),
  preferredVenuesOrder: z.array(z.string()).optional(),
  defaultAvailability: z.record(z.unknown()).optional().nullable(),
  autoSubmitAvailability: z.boolean().optional(),
  notificationPrefs: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .optional()
    .nullable(),
});

// Venue validation schemas
export const venueCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Venue name is required')
    .max(100, 'Name is too long'),
  isNetworked: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  availabilityDeadlineDay: z.number().int().min(1).max(28).default(10),
  tipPoolEnabled: z.boolean().default(false),
  tradeDeadlineHours: z.number().int().min(0).max(168).default(24), // 0-168 hours (0-7 days)
  managerIds: z.array(z.string()).optional(),
});

export const venueUpdateSchema = venueCreateSchema.partial().extend({
  id: z.string(),
});

// Shift validation schemas
export const shiftCreateSchema = z.object({
  venueId: z.string(),
  date: z.coerce.date(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  bartendersRequired: z.number().int().min(0).default(1),
  barbacksRequired: z.number().int().min(0).default(0),
  leadsRequired: z.number().int().min(0).default(0),
  eventName: z.string().min(1, 'Event name is required'),
});

export const shiftUpdateSchema = shiftCreateSchema.partial().extend({
  id: z.string(),
  eventName: z.string().min(1, 'Event name is required'), // Required even in updates
});

// Shift assignment validation schemas
export const shiftAssignmentSchema = z.object({
  shiftId: z.string(),
  userId: z.string(),
  role: z.enum(['BARTENDER', 'BARBACK']),
  isLead: z.boolean().default(false),
});

// Override validation schemas
export const overrideCreateSchema = z.object({
  shiftId: z.string(),
  userId: z.string(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  violationType: z.enum([
    'cutoff',
    'request_off',
    'double_booking',
    'lead_shortage',
  ]),
});

export const overrideApprovalSchema = z.object({
  overrideId: z.string(),
  approved: z.boolean(),
  comment: z.string().optional(),
});

// Availability validation schemas
export const availabilitySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
  data: z.record(z.unknown()),
});

// Trade validation schemas
export const tradeCreateSchema = z.object({
  shiftId: z.string(),
  receiverId: z.string(),
  reason: z.string().optional(),
});

export const tradeUpdateSchema = z.object({
  id: z.string(),
  status: z.enum(['ACCEPTED', 'DECLINED', 'CANCELLED']),
  reason: z.string().optional(),
});

export const tradeApprovalSchema = z.object({
  id: z.string(),
  approved: z.boolean(),
  declinedReason: z.string().optional(),
});

// Tip payout validation schemas
export const tipPayoutSchema = z.object({
  userId: z.string(),
  shiftId: z.string(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
});

// Export type inference helpers
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type VenueCreateInput = z.infer<typeof venueCreateSchema>;
export type VenueUpdateInput = z.infer<typeof venueUpdateSchema>;
export type ShiftCreateInput = z.infer<typeof shiftCreateSchema>;
export type ShiftUpdateInput = z.infer<typeof shiftUpdateSchema>;
export type ShiftAssignmentInput = z.infer<typeof shiftAssignmentSchema>;
export type OverrideCreateInput = z.infer<typeof overrideCreateSchema>;
export type OverrideApprovalInput = z.infer<typeof overrideApprovalSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type TradeCreateInput = z.infer<typeof tradeCreateSchema>;
export type TradeUpdateInput = z.infer<typeof tradeUpdateSchema>;
export type TradeApprovalInput = z.infer<typeof tradeApprovalSchema>;
export type TipPayoutInput = z.infer<typeof tipPayoutSchema>;
