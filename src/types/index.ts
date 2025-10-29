import { Role, UserStatus, OverrideStatus, TradeStatus, NotificationType } from '@prisma/client';

export type { Role, UserStatus, OverrideStatus, TradeStatus, NotificationType };

// User types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  hasDayJob: boolean;
  dayJobCutoff: string | null;
  isLead: boolean;
  preferredVenuesOrder: string[];
  defaultAvailability: Record<string, unknown> | null;
  autoSubmitAvailability: boolean;
  notificationPrefs: Record<string, unknown> | null;
}

// Venue types
export interface VenueData {
  id: string;
  name: string;
  isNetworked: boolean;
  priority: number;
  availabilityDeadlineDay: number;
  tipPoolEnabled: boolean;
  createdById: string;
}

// Shift types
export interface ShiftData {
  id: string;
  venueId: string;
  date: Date;
  startTime: string;
  endTime: string;
  bartendersRequired: number;
  barbacksRequired: number;
  leadsRequired: number;
}

export interface ShiftAssignmentData {
  id: string;
  shiftId: string;
  userId: string;
  role: Role;
  isLead: boolean;
  tipAmount: number | null;
  tipCurrency: string | null;
}

// Override types
export interface OverrideData {
  id: string;
  shiftId: string;
  userId: string;
  reason: string;
  violationType: 'cutoff' | 'request_off' | 'double_booking' | 'lead_shortage';
  status: OverrideStatus;
  approvals: OverrideApprovalData[];
}

export interface OverrideApprovalData {
  id: string;
  overrideId: string;
  approverId: string;
  approved: boolean;
  comment: string | null;
  createdAt: Date;
}

// Availability types
export interface AvailabilityData {
  id: string;
  userId: string;
  month: string;
  data: Record<string, unknown>;
  submittedAt: Date | null;
  lockedAt: Date | null;
  isLocked: boolean;
}

// Trade types
export interface ShiftTradeData {
  id: string;
  shiftId: string;
  proposerId: string;
  receiverId: string;
  status: TradeStatus;
  reason: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
}

// Notification types
export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  sentAt: Date;
  readAt: Date | null;
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  suggestion: string;
  violationType?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Report types
export interface UserShiftReport {
  userId: string;
  userName: string;
  totalShifts: number;
  leadShifts: number;
  venues: Record<string, number>;
}

export interface VenueReport {
  venueId: string;
  venueName: string;
  totalShifts: number;
  uniqueStaff: number;
  averageShiftsPerUser: number;
  leadCoveragePercent: number;
  overridesCount: number;
}

