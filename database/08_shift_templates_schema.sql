-- ====================================================================
-- 08. SHIFT TEMPLATES SCHEMA (Schema: dlabs)
-- Dynamic Shift Templates for Duty Rostering
-- ====================================================================

CREATE SCHEMA IF NOT EXISTS dlabs;

CREATE TABLE IF NOT EXISTS dlabs."sms_hrms_shift_templates" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "label" VARCHAR(100) NOT NULL UNIQUE,
    "start_time" VARCHAR(10) NOT NULL, -- Format: HH:MM (24-hour)
    "end_time" VARCHAR(10) NOT NULL,   -- Format: HH:MM (24-hour)
    "color_class" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN DEFAULT TRUE,
    "display_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active shifts lookup
CREATE INDEX IF NOT EXISTS "idx_shift_templates_active" 
ON dlabs."sms_hrms_shift_templates" ("is_active", "display_order");

-- Seed default company shifts
INSERT INTO dlabs."sms_hrms_shift_templates" ("label", "start_time", "end_time", "color_class", "display_order")
VALUES
    ('Morning Shift', '08:00', '16:00', 'bg-emerald-100 text-emerald-800 border-emerald-200', 1),
    ('General Shift 1', '09:00', '17:00', 'bg-teal-100 text-teal-800 border-teal-200', 2),
    ('General Shift 2', '10:00', '18:00', 'bg-cyan-100 text-cyan-800 border-cyan-200', 3),
    ('Afternoon Shift', '13:00', '20:00', 'bg-orange-100 text-orange-800 border-orange-200', 4),
    ('Night Shift', '20:00', '08:00', 'bg-indigo-100 text-indigo-800 border-indigo-200', 5),
    ('Off', '00:00', '00:00', 'bg-slate-100 text-slate-800 border-slate-200', 6)
ON CONFLICT ("label") DO NOTHING;

-- Disable RLS for full client HRMS access
ALTER TABLE IF EXISTS dlabs."sms_hrms_shift_templates" DISABLE ROW LEVEL SECURITY;
