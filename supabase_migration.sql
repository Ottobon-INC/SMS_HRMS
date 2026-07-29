-- Supabase Migration to add JSONB bank_details column
-- Run this in your Supabase SQL Editor if the bank_details column does not exist yet.

ALTER TABLE "HRMS_employees" 
ADD COLUMN IF NOT EXISTS bank_details JSONB;

ALTER TABLE "HRMS_payroll"
ADD COLUMN IF NOT EXISTS working_days NUMERIC(5, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS days_present NUMERIC(5, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS leaves_taken NUMERIC(5, 2) DEFAULT NULL;
