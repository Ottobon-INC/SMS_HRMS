-- ====================================================================
-- 07. EXPERIENCE LETTER SCHEMA (Schema: dlabs)
-- Stores customized experience letters generated for employees
-- ====================================================================

CREATE SCHEMA IF NOT EXISTS dlabs;

CREATE TABLE IF NOT EXISTS dlabs."sms_hrms_experience_letters" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL,
    "letter_data" JSONB NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sms_hrms_experience_letters_emp_unique" UNIQUE ("employee_id")
);

-- Index for fast lookup by employee_id
CREATE INDEX IF NOT EXISTS "idx_sms_hrms_experience_letters_emp" 
ON dlabs."sms_hrms_experience_letters" ("employee_id");

-- Ensure public access for client HRMS app
ALTER TABLE IF EXISTS dlabs."sms_hrms_experience_letters" DISABLE ROW LEVEL SECURITY;
