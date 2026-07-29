-- ====================================================================
-- HRMS Supabase Tables Schema
-- All tables are prefixed with "HRMS_" as requested.
-- Copy and run this script in your Supabase SQL Editor.
-- ====================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create HRMS_employees Table
CREATE TABLE IF NOT EXISTS "HRMS_employees" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL CHECK ("role" IN ('employee', 'admin')),
    "designation" VARCHAR(255) NOT NULL,
    "joining_date" DATE NOT NULL,
    "basic_pay" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'inactive')),

    "phone" VARCHAR(50),
    "gender" VARCHAR(10),
    "experience" NUMERIC(4, 1) DEFAULT 0.0,
    "dob" DATE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create HRMS_attendance Table
CREATE TABLE IF NOT EXISTS "HRMS_attendance" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "status" VARCHAR(100) NOT NULL,
    "check_in_time" TIME WITHOUT TIME ZONE,
    "check_out_time" TIME WITHOUT TIME ZONE,
    "check_in_location" TEXT,
    "check_in_lat_lng" VARCHAR(50),
    "check_in_photo_url" TEXT,
    "check_out_photo_url" TEXT,
    "punch_type" VARCHAR(50) DEFAULT 'in_office' CHECK ("punch_type" IN ('in_office', 'out_of_office')),
    "punch_note" TEXT,
    "session_number" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_date_session UNIQUE ("employee_id", "date", "session_number")
);

-- 4. Create HRMS_leave_requests Table
CREATE TABLE IF NOT EXISTS "HRMS_leave_requests" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "leave_type" VARCHAR(100) NOT NULL CHECK ("leave_type" IN ('sick', 'casual', 'maternity', 'paternity')),
    "from_date" DATE NOT NULL,
    "to_date" DATE NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK ("status" IN ('Pending', 'Approved', 'Rejected')),
    "submitted_at" DATE DEFAULT CURRENT_DATE,
    "admin_note" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create HRMS_leave_balances" Table
CREATE TABLE IF NOT EXISTS "HRMS_leave_balances" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "leave_type" VARCHAR(100) NOT NULL CHECK ("leave_type" IN ('sick', 'casual', 'maternity', 'paternity')),
    "total_allotted" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_leave_type UNIQUE ("employee_id", "leave_type")
);

-- 6. Create HRMS_payroll Table
CREATE TABLE IF NOT EXISTS "HRMS_payroll" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "month" VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    "basic_pay" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "allowances" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "deductions" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "net_pay" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "advance_money_taken" BOOLEAN DEFAULT FALSE,
    "advance_money_amount" NUMERIC(12, 2) DEFAULT 0.00,
    "working_days" NUMERIC(5, 2) DEFAULT NULL,
    "days_present" NUMERIC(5, 2) DEFAULT NULL,
    "leaves_taken" NUMERIC(5, 2) DEFAULT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_payroll_month UNIQUE ("employee_id", "month")
);

-- 7. Create HRMS_advance_requests Table
CREATE TABLE IF NOT EXISTS "HRMS_advance_requests" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "amount" NUMERIC(12, 2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected', 'deducted')),
    "submitted_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP WITH TIME ZONE,
    "deducted_in_month" VARCHAR(7),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create HRMS_invoices Table
CREATE TABLE IF NOT EXISTS "HRMS_invoices" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "invoice_number" VARCHAR(255) UNIQUE NOT NULL,
    "client_name" VARCHAR(255) NOT NULL,
    "client_details" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "total" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "payable_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "created_by" VARCHAR(255),
    "due_date" DATE,
    "tax_percent" NUMERIC(5, 2) DEFAULT 18.00,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Create HRMS_monthly_leave_quota Table
CREATE TABLE IF NOT EXISTS "HRMS_monthly_leave_quota" (
    "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "month"       VARCHAR(7) NOT NULL,
    "allotted"    INTEGER NOT NULL DEFAULT 3,
    "used"        INTEGER NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_emp_month UNIQUE ("employee_id", "month")
);

-- 10. Create HRMS_office_locations Table
CREATE TABLE IF NOT EXISTS "HRMS_office_locations" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "name"          VARCHAR(255) NOT NULL,
    "latitude"      NUMERIC(10, 7) NOT NULL,
    "longitude"     NUMERIC(10, 7) NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 50,
    "is_active"     BOOLEAN DEFAULT TRUE,
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create HRMS_special_location_events Table
CREATE TABLE IF NOT EXISTS "HRMS_special_location_events" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "name"          VARCHAR(255) NOT NULL,
    "event_type"    VARCHAR(50) DEFAULT 'medical_camp',
    "latitude"      NUMERIC(10, 7) NOT NULL,
    "longitude"     NUMERIC(10, 7) NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 50,
    "from_date"     DATE NOT NULL,
    "to_date"       DATE NOT NULL,
    "created_by"    VARCHAR(255) REFERENCES "HRMS_employees"("id"),
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Create HRMS_special_event_assignees Table
CREATE TABLE IF NOT EXISTS "HRMS_special_event_assignees" (
    "event_id"    UUID REFERENCES "HRMS_special_location_events"("id") ON DELETE CASCADE,
    "employee_id" VARCHAR(255) REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    PRIMARY KEY ("event_id", "employee_id")
);

-- 13. Create HRMS_chat_channels Table
CREATE TABLE IF NOT EXISTS "HRMS_chat_channels" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "name"          VARCHAR(255),
    "type"          VARCHAR(50) DEFAULT 'direct' CHECK ("type" IN ('direct', 'group')),
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Create HRMS_chat_messages Table
CREATE TABLE IF NOT EXISTS "HRMS_chat_messages" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "channel_id"    UUID NOT NULL REFERENCES "HRMS_chat_channels"("id") ON DELETE CASCADE,
    "sender_id"     VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "text"          TEXT,
    "attachment_url" VARCHAR(255),
    "attachment_type" VARCHAR(50),
    "attachment_name" VARCHAR(255),
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Create HRMS_location_pins Table
CREATE TABLE IF NOT EXISTS "HRMS_location_pins" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id"   VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "date"          DATE NOT NULL DEFAULT CURRENT_DATE,
    "pinned_at"     TIME WITHOUT TIME ZONE NOT NULL, -- HH:MM:SS
    "label"         TEXT,                             -- e.g. "Medical Camp - Gajuwaka"
    "latitude"      NUMERIC(10, 7),
    "longitude"     NUMERIC(10, 7),
    "location_name" TEXT,                             -- reverse-geocoded string
    "photo_url"     TEXT,                             -- optional selfie
    "pin_type"      VARCHAR(50) DEFAULT 'field_visit'
                    CHECK ("pin_type" IN ('field_visit', 'medical_camp', 'client_site', 'delivery', 'other')),
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Create HRMS_payroll_config Table
CREATE TABLE IF NOT EXISTS "HRMS_payroll_config" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "config_key" VARCHAR(100) UNIQUE NOT NULL,
  "config_value" NUMERIC(12,2) NOT NULL,
  "label" VARCHAR(255),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Create HRMS_duty_roster Table
CREATE TABLE IF NOT EXISTS "HRMS_duty_roster" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
  "shift_date" DATE NOT NULL,
  "shift_start" TIME NOT NULL,
  "shift_end" TIME NOT NULL,
  "shift_label" VARCHAR(255),
  "notes" TEXT,
  "is_published" BOOLEAN DEFAULT FALSE,
  "created_by" VARCHAR(255) REFERENCES "HRMS_employees"("id"),
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_roster_entry UNIQUE ("employee_id", "shift_date")
);

-- Enable Row Level Security (RLS) by default (or disable if you want fully open client access)
-- To allow the client application to read and write without authentication blocks initially:
ALTER TABLE "HRMS_employees" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_attendance" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_leave_requests" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_leave_balances" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_payroll" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_advance_requests" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_invoices" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_monthly_leave_quota" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_office_locations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_special_location_events" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_special_event_assignees" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_chat_channels" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_chat_messages" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_location_pins" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_payroll_config" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_duty_roster" DISABLE ROW LEVEL SECURITY;
-- 13. FORCE REFRESH SUPABASE SCHEMA CACHE
-- PostgREST (Supabase API) caches table schemas. If you created tables via the SQL editor,
-- the schema cache must be reloaded. Run the following command to refresh it immediately:
NOTIFY pgrst, 'reload schema';

-- ====================================================================
-- ====================================================================
-- MIGRATION: Add punch_type, punch_note and session_number to HRMS_attendance
-- Run this in Supabase SQL Editor if the table already exists.
-- ====================================================================
ALTER TABLE "HRMS_attendance" DROP CONSTRAINT IF EXISTS unique_employee_date;

ALTER TABLE "HRMS_attendance"
  ADD COLUMN IF NOT EXISTS "punch_type" VARCHAR(50) DEFAULT 'in_office'
  CHECK ("punch_type" IN ('in_office', 'out_of_office')),
  ADD COLUMN IF NOT EXISTS "punch_note" TEXT,
  ADD COLUMN IF NOT EXISTS "session_number" INTEGER DEFAULT 1;

ALTER TABLE "HRMS_attendance" DROP CONSTRAINT IF EXISTS unique_employee_date_session;
ALTER TABLE "HRMS_attendance" 
  ADD CONSTRAINT unique_employee_date_session 
  UNIQUE ("employee_id", "date", "session_number");

-- ====================================================================
-- MIGRATION: Add advance repayment tracking columns to HRMS_advance_requests
-- Run this in Supabase SQL Editor if the table already exists.
-- ====================================================================
ALTER TABLE "HRMS_advance_requests"
  ADD COLUMN IF NOT EXISTS "repayment_months" INTEGER DEFAULT 2
    CHECK ("repayment_months" IN (2, 3, 5)),
  ADD COLUMN IF NOT EXISTS "monthly_installment" NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "installments_remaining" INTEGER DEFAULT 0;

NOTIFY pgrst, 'reload schema';
