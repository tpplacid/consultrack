-- ============================================================
-- AdmiShine CRM - Seed Data
-- ============================================================

-- 1. Create the default org
INSERT INTO orgs (id, name, slug)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'AdmiShine',
  'admishine'
) ON CONFLICT (slug) DO NOTHING;

-- 2. Create admin user in Supabase Auth (run AFTER creating the org)
-- This must be run via the Supabase Auth admin API or dashboard:
--   Email: ranjithpkvy1@gmail.com
--   Password: admishine_2026
-- The auth.users row is created via Auth API; this seeds the employees record.

-- NOTE: Replace the auth user UUID below after creating the user in Supabase Auth dashboard
-- INSERT INTO employees (id, org_id, email, name, role, score, is_active)
-- VALUES (
--   '<auth-user-uuid>',
--   'aaaaaaaa-0000-0000-0000-000000000001',
--   'ranjithpkvy1@gmail.com',
--   'Ranjith P K',
--   'ad',
--   10,
--   true
-- );

-- 3. Sample WhatsApp templates
INSERT INTO wa_templates (org_id, name, body, is_active)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Initial Contact',
    'Hi {{name}}, this is AdmiShine Admissions Consultancy. We noticed your interest in college admissions. We''d love to help you secure your dream college! Can we schedule a quick call?',
    true
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Follow Up',
    'Hi {{name}}, following up on our previous conversation regarding college admissions. Have you had a chance to review the information we shared? We''re here to help!',
    true
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Hot Lead Engagement',
    'Hi {{name}}, great news! We have shortlisted the best colleges matching your profile. Our counsellor would like to connect with you this week. Please let us know your preferred time.',
    true
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Document Reminder',
    'Hi {{name}}, this is a reminder to submit your documents for the admission application. Please have your 12th marksheet, ID proof, and passport-size photos ready.',
    true
  );
