-- ============================================================
-- AdmiShine CRM - Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_lead_approvals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: get current employee's org_id and role
-- ============================================================
CREATE OR REPLACE FUNCTION auth_employee_org_id()
RETURNS uuid AS $$
  SELECT org_id FROM employees WHERE email = auth.email()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_employee_id()
RETURNS uuid AS $$
  SELECT id FROM employees WHERE email = auth.email()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_employee_role()
RETURNS text AS $$
  SELECT role FROM employees WHERE email = auth.email()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_employee_reports_to()
RETURNS uuid AS $$
  SELECT reports_to FROM employees WHERE email = auth.email()
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- ORGS
-- ============================================================
CREATE POLICY "orgs_select" ON orgs
  FOR SELECT USING (id = auth_employee_org_id());

-- ============================================================
-- EMPLOYEES
-- ============================================================
-- All employees in the same org can view each other
CREATE POLICY "employees_select" ON employees
  FOR SELECT USING (org_id = auth_employee_org_id());

-- Only AD can insert/update/delete employees
CREATE POLICY "employees_insert" ON employees
  FOR INSERT WITH CHECK (
    org_id = auth_employee_org_id()
    AND auth_employee_role() = 'ad'
  );

CREATE POLICY "employees_update" ON employees
  FOR UPDATE USING (
    org_id = auth_employee_org_id()
    AND auth_employee_role() = 'ad'
  );

CREATE POLICY "employees_delete" ON employees
  FOR DELETE USING (auth_employee_role() = 'ad');

-- ============================================================
-- LEADS
-- ============================================================
-- AD sees all leads in their org
-- TL sees their own leads + their direct reports' leads
-- Others see only their own leads
CREATE POLICY "leads_select" ON leads
  FOR SELECT USING (
    org_id = auth_employee_org_id()
    AND (
      auth_employee_role() IN ('ad')
      OR owner_id = auth_employee_id()
      OR reporting_manager_id = auth_employee_id()
    )
  );

CREATE POLICY "leads_insert" ON leads
  FOR INSERT WITH CHECK (org_id = auth_employee_org_id());

CREATE POLICY "leads_update" ON leads
  FOR UPDATE USING (
    org_id = auth_employee_org_id()
    AND (
      auth_employee_role() IN ('ad')
      OR owner_id = auth_employee_id()
      OR reporting_manager_id = auth_employee_id()
    )
  );

CREATE POLICY "leads_delete" ON leads
  FOR DELETE USING (auth_employee_role() = 'ad');

-- ============================================================
-- ACTIVITIES
-- ============================================================
CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (org_id = auth_employee_org_id());

CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (
    org_id = auth_employee_org_id()
    AND employee_id = auth_employee_id()
  );

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE POLICY "attendance_select" ON attendance
  FOR SELECT USING (
    org_id = auth_employee_org_id()
    AND (
      auth_employee_role() IN ('ad','tl')
      OR employee_id = auth_employee_id()
    )
  );

CREATE POLICY "attendance_insert" ON attendance
  FOR INSERT WITH CHECK (
    org_id = auth_employee_org_id()
    AND employee_id = auth_employee_id()
  );

CREATE POLICY "attendance_update" ON attendance
  FOR UPDATE USING (
    org_id = auth_employee_org_id()
    AND (
      auth_employee_role() = 'ad'
      OR employee_id = auth_employee_id()
    )
  );

-- ============================================================
-- LEAVES
-- ============================================================
CREATE POLICY "leaves_select" ON leaves
  FOR SELECT USING (
    org_id = auth_employee_org_id()
    AND (
      auth_employee_role() = 'ad'
      OR employee_id = auth_employee_id()
    )
  );

CREATE POLICY "leaves_insert" ON leaves
  FOR INSERT WITH CHECK (
    org_id = auth_employee_org_id()
    AND employee_id = auth_employee_id()
  );

CREATE POLICY "leaves_update" ON leaves
  FOR UPDATE USING (
    org_id = auth_employee_org_id()
    AND auth_employee_role() = 'ad'
  );

-- ============================================================
-- WEEKOFFS
-- ============================================================
CREATE POLICY "weekoffs_select" ON weekoffs
  FOR SELECT USING (org_id = auth_employee_org_id());

CREATE POLICY "weekoffs_insert" ON weekoffs
  FOR INSERT WITH CHECK (
    org_id = auth_employee_org_id()
    AND auth_employee_role() = 'ad'
  );

CREATE POLICY "weekoffs_update" ON weekoffs
  FOR UPDATE USING (auth_employee_role() = 'ad');

CREATE POLICY "weekoffs_delete" ON weekoffs
  FOR DELETE USING (auth_employee_role() = 'ad');

-- ============================================================
-- SLA BREACHES
-- ============================================================
CREATE POLICY "sla_breaches_select" ON sla_breaches
  FOR SELECT USING (
    org_id = auth_employee_org_id()
    AND (
      auth_employee_role() IN ('ad','tl')
      OR owner_id = auth_employee_id()
    )
  );

CREATE POLICY "sla_breaches_insert" ON sla_breaches
  FOR INSERT WITH CHECK (org_id = auth_employee_org_id());

CREATE POLICY "sla_breaches_update" ON sla_breaches
  FOR UPDATE USING (
    org_id = auth_employee_org_id()
    AND auth_employee_role() IN ('ad','tl')
  );

-- ============================================================
-- WA TEMPLATES
-- ============================================================
CREATE POLICY "wa_templates_select" ON wa_templates
  FOR SELECT USING (org_id = auth_employee_org_id());

CREATE POLICY "wa_templates_insert" ON wa_templates
  FOR INSERT WITH CHECK (
    org_id = auth_employee_org_id()
    AND auth_employee_role() = 'ad'
  );

CREATE POLICY "wa_templates_update" ON wa_templates
  FOR UPDATE USING (auth_employee_role() = 'ad');

CREATE POLICY "wa_templates_delete" ON wa_templates
  FOR DELETE USING (auth_employee_role() = 'ad');

-- ============================================================
-- OFFLINE LEAD APPROVALS
-- ============================================================
CREATE POLICY "ola_select" ON offline_lead_approvals
  FOR SELECT USING (
    org_id = auth_employee_org_id()
    AND (
      auth_employee_role() = 'ad'
      OR submitted_by = auth_employee_id()
      OR approver_id = auth_employee_id()
    )
  );

CREATE POLICY "ola_insert" ON offline_lead_approvals
  FOR INSERT WITH CHECK (org_id = auth_employee_org_id());

CREATE POLICY "ola_update" ON offline_lead_approvals
  FOR UPDATE USING (
    org_id = auth_employee_org_id()
    AND (
      auth_employee_role() = 'ad'
      OR approver_id = auth_employee_id()
    )
  );
