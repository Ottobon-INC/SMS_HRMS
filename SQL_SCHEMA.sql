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
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_date UNIQUE ("employee_id", "date")
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

-- Enable Row Level Security (RLS) by default (or disable if you want fully open client access)
-- To allow the client application to read and write without authentication blocks initially:
ALTER TABLE "HRMS_employees" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_attendance" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_leave_requests" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_leave_balances" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_payroll" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_advance_requests" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_invoices" DISABLE ROW LEVEL SECURITY;

-- 8. FORCE REFRESH SUPABASE SCHEMA CACHE
-- PostgREST (Supabase API) caches table schemas. If you created tables via the SQL editor,
-- the schema cache must be reloaded. Run the following command to refresh it immediately:
NOTIFY pgrst, 'reload schema';


-- ====================================================================
-- MIGRATION: Add status and phone to existing HRMS_employees table
-- If you have already created the table before this update, run these:
-- ====================================================================
-- ALTER TABLE "HRMS_employees" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'inactive'));
-- ALTER TABLE "HRMS_employees" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50);
-- ALTER TABLE "HRMS_employees" ADD COLUMN IF NOT EXISTS "gender" VARCHAR(10);
-- ALTER TABLE "HRMS_employees" ADD COLUMN IF NOT EXISTS "experience" NUMERIC(4, 1) DEFAULT 0.0;

-- ALTER TABLE "HRMS_leave_requests" DROP CONSTRAINT IF EXISTS "HRMS_leave_requests_leave_type_check";
-- ALTER TABLE "HRMS_leave_requests" ADD CONSTRAINT "HRMS_leave_requests_leave_type_check" CHECK ("leave_type" IN ('sick', 'casual', 'maternity', 'paternity'));

-- ALTER TABLE "HRMS_leave_balances" DROP CONSTRAINT IF EXISTS "HRMS_leave_balances_leave_type_check";
-- ALTER TABLE "HRMS_leave_balances" ADD CONSTRAINT "HRMS_leave_balances_leave_type_check" CHECK ("leave_type" IN ('sick', 'casual', 'maternity', 'paternity'));

-- ALTER TABLE "HRMS_payroll" ADD COLUMN IF NOT EXISTS "advance_money_taken" BOOLEAN DEFAULT FALSE;
-- ALTER TABLE "HRMS_payroll" ADD COLUMN IF NOT EXISTS "advance_money_taken" BOOLEAN DEFAULT FALSE;
-- ALTER TABLE "HRMS_payroll" ADD COLUMN IF NOT EXISTS "advance_money_amount" NUMERIC(12, 2) DEFAULT 0.00;

-- ALTER TABLE "HRMS_attendance" ADD COLUMN IF NOT EXISTS "check_in_location" TEXT;
-- ALTER TABLE "HRMS_attendance" ADD COLUMN IF NOT EXISTS "check_in_lat_lng" VARCHAR(50);
