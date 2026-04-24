# AdmiShine CRM — Deployment Guide

## Prerequisites
- Node.js 18+
- Supabase account
- Vercel account (GitHub: abhisheknair917@gmail.com)

---

## Step 1 — Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY`

3. Run migrations in order via **SQL Editor**:
   ```
   supabase/migrations/001_schema.sql
   supabase/migrations/002_rls.sql
   supabase/migrations/003_seed.sql
   ```

4. Create the admin user in **Authentication → Users → Add user**:
   - Email: `ranjithpkvy1@gmail.com`
   - Password: `admishine_2026`
   - After creating, copy the user UUID

5. Insert admin employee row via SQL Editor (replace `<UUID>` with the user's UUID):
   ```sql
   INSERT INTO employees (id, org_id, email, name, role, score, is_active)
   VALUES (
     '<UUID>',
     'aaaaaaaa-0000-0000-0000-000000000001',
     'ranjithpkvy1@gmail.com',
     'Ranjith P K',
     'ad',
     10,
     true
   );
   ```

6. Enable Realtime for tables (already in migration, but verify in **Database → Replication**):
   - leads, activities, sla_breaches, offline_lead_approvals

---

## Step 2 — Deploy to Vercel

1. Push repo to GitHub under `abhisheknair917@gmail.com`'s account
2. Import project at https://vercel.com/new
3. Set all env vars from `.env.example` in Vercel project settings
4. Deploy

---

## Step 3 — Meta Webhook Setup

1. Go to Meta for Developers → your App → Webhooks
2. Subscribe to `leadgen` changes for your Page
3. Set webhook URL: `https://yourdomain.vercel.app/api/meta/webhook`
4. Set verify token to match `META_VERIFY_TOKEN` env var
5. Ensure `META_PAGE_ACCESS_TOKEN` has `leads_retrieval` permission

---

## Step 4 — Supabase Edge Functions (SLA Checker)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy function
supabase functions deploy sla-checker

# Schedule to run hourly (via Supabase Dashboard → Edge Functions → Schedule)
# Cron: 0 * * * *
```

Set these secrets in the Supabase dashboard (Edge Functions → Secrets):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENGAGELO_API_KEY`
- `ENGAGELO_API_URL`

---

## Step 5 — Add Employees

1. Log in as `ranjithpkvy1@gmail.com` / `admishine_2026`
2. Go to `/admin/employees`
3. Click "Add Employee" — set email, name, role, password, reporting manager
4. Employee can log in at `/login` with those credentials

---

## WiFi Check-in Setup

- In `/admin/employees`, set `wifi_ssid` per employee (the office WiFi SSID they should enter)
- Employees enter their WiFi SSID on clock-in; system checks it against the stored value

---

## Multi-Tenant Notes

- Each client = 1 row in `orgs` + 1 admin user
- All RLS policies scope to `org_id`
- To add a new client: insert into `orgs`, create their admin user in Supabase Auth, insert into `employees`
