-- ============================================================
-- AdmiShine CRM - Full Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORGS (multi-tenant)
-- ============================================================
CREATE TABLE orgs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('telesales', 'counsellor', 'tl', 'ad')),
  reports_to uuid REFERENCES employees(id) ON DELETE SET NULL,
  score int DEFAULT 5 CHECK (score BETWEEN 1 AND 10),
  is_active boolean DEFAULT true,
  is_on_leave boolean DEFAULT false,
  wifi_ssid text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  source text NOT NULL CHECK (source IN ('meta', 'offline', 'referral')),
  main_stage text NOT NULL DEFAULT '0' CHECK (main_stage IN ('0','A','B','C','D','E','F','G','X','Y')),
  sub_stage text,
  owner_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  reporting_manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  stage_entered_at timestamptz DEFAULT now(),
  sla_deadline timestamptz,
  next_followup_at timestamptz,
  lead_type text,
  location text,
  twelfth_score int,
  preferred_course text,
  interested_colleges text[] DEFAULT '{}',
  alternate_courses text[] DEFAULT '{}',
  father_phone text,
  decision_maker text CHECK (decision_maker IN ('father','mother','sibling','relative')),
  income_status text,
  loan_status text CHECK (loan_status IN ('yes','no')),
  comments text,
  approved boolean DEFAULT false,
  approved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  meta_lead_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_leads_org ON leads(org_id);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_stage ON leads(main_stage);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_meta ON leads(meta_lead_id);

-- ============================================================
-- ACTIVITIES
-- ============================================================
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('stage_change','comment','field_update','call_log','whatsapp_sent','lead_created')),
  note text,
  stage_from text,
  stage_to text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activities_lead ON activities(lead_id);
CREATE INDEX idx_activities_employee ON activities(employee_id);
CREATE INDEX idx_activities_org ON activities(org_id);
CREATE INDEX idx_activities_created ON activities(created_at);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  wifi_verified boolean DEFAULT false,
  manual_override boolean DEFAULT false,
  override_reason text,
  override_approved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  status text DEFAULT 'present' CHECK (status IN ('present','absent','half_day','questioned','rejected')),
  admin_note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(work_date);

-- ============================================================
-- LEAVES
-- ============================================================
CREATE TABLE leaves (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_date date NOT NULL,
  leave_type text NOT NULL CHECK (leave_type IN ('sick','casual','emergency')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- WEEKOFFS
-- ============================================================
CREATE TABLE weekoffs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week text,
  specific_date date,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL
);

-- ============================================================
-- SLA BREACHES
-- ============================================================
CREATE TABLE sla_breaches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  stage text NOT NULL,
  breached_at timestamptz DEFAULT now(),
  resolution text DEFAULT 'pending' CHECK (resolution IN ('closed','explanation_requested','pending')),
  resolved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  explanation text,
  explanation_status text CHECK (explanation_status IN ('pending','resolved')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sla_breaches_owner ON sla_breaches(owner_id);
CREATE INDEX idx_sla_breaches_lead ON sla_breaches(lead_id);

-- ============================================================
-- WA TEMPLATES
-- ============================================================
CREATE TABLE wa_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- OFFLINE LEAD APPROVALS
-- ============================================================
CREATE TABLE offline_lead_approvals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TRIGGER: update leads.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION: compute_sla_deadline
-- ============================================================
CREATE OR REPLACE FUNCTION compute_sla_deadline(stage text, entered_at timestamptz)
RETURNS timestamptz AS $$
BEGIN
  CASE stage
    WHEN 'A' THEN RETURN entered_at + INTERVAL '1 day';
    WHEN 'B' THEN RETURN entered_at + INTERVAL '5 days';
    WHEN 'C' THEN RETURN entered_at + INTERVAL '5 days';
    WHEN 'D' THEN RETURN entered_at + INTERVAL '20 days';
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: auto-set sla_deadline on stage change
-- ============================================================
CREATE OR REPLACE FUNCTION auto_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.main_stage <> OLD.main_stage THEN
    NEW.stage_entered_at = now();
    NEW.sla_deadline = compute_sla_deadline(NEW.main_stage, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_sla_deadline
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION auto_sla_deadline();

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE sla_breaches;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE offline_lead_approvals;
