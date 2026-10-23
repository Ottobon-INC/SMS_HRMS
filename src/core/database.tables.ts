/**
 * SMS HRMS Database Tables Registry
 * Centralized source of truth for all Supabase database table names.
 */

export const TABLE_PREFIX = 'sms_hrms_';

export const DB_TABLES = {
  // Core HR
  EMPLOYEES: `${TABLE_PREFIX}employees`,
  ATTENDANCE: `${TABLE_PREFIX}attendance`,
  LEAVE_REQUESTS: `${TABLE_PREFIX}leave_requests`,
  LEAVE_BALANCES: `${TABLE_PREFIX}leave_balances`,
  PAYROLL: `${TABLE_PREFIX}payroll`,
  ADVANCE_REQUESTS: `${TABLE_PREFIX}advance_requests`,
  INVOICES: `${TABLE_PREFIX}invoices`,
  MONTHLY_LEAVE_QUOTA: `${TABLE_PREFIX}monthly_leave_quota`,
  MONTHLY_OFF_QUOTA: `${TABLE_PREFIX}monthly_off_quota`,
  MISSED_PUNCH_REQUESTS: `${TABLE_PREFIX}missed_punch_requests`,
  PERMISSION_REQUESTS: `${TABLE_PREFIX}permission_requests`,
  WEEKLY_OFF_REQUESTS: `${TABLE_PREFIX}weekly_off_requests`,

  // Locations & Rostering
  OFFICE_LOCATIONS: `${TABLE_PREFIX}office_locations`,
  SPECIAL_LOCATION_EVENTS: `${TABLE_PREFIX}special_location_events`,
  SPECIAL_EVENT_ASSIGNEES: `${TABLE_PREFIX}special_event_assignees`,
  LOCATION_PINS: `${TABLE_PREFIX}location_pins`,
  PAYROLL_CONFIG: `${TABLE_PREFIX}payroll_config`,
  DUTY_ROSTER: `${TABLE_PREFIX}duty_roster`,

  // Chat & Messaging
  CHAT_CHANNELS: `${TABLE_PREFIX}chat_channels`,
  CHAT_MESSAGES: `${TABLE_PREFIX}chat_messages`,
  CHAT_PARTICIPANTS: `${TABLE_PREFIX}chat_participants`,
  MESSAGE_READS: `${TABLE_PREFIX}message_reads`,

  // Field Force Ops
  FIELD_SESSIONS: `${TABLE_PREFIX}field_sessions`,
  FIELD_VISITS: `${TABLE_PREFIX}field_visits`,
  FIELD_VISIT_EVENTS: `${TABLE_PREFIX}field_visit_events`,
  FIELD_VISIT_PROOFS: `${TABLE_PREFIX}field_visit_proofs`,

  // Tasks & Work Assignments
  TASKS: `${TABLE_PREFIX}tasks`,
} as const;

export type DbTableName = (typeof DB_TABLES)[keyof typeof DB_TABLES];
