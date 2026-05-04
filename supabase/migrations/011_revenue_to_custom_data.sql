-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011 — Revenue fields → custom_data with org-defined currency fields
-- ─────────────────────────────────────────────────────────────────────────────
-- Context: application_fees / booking_fees / tuition_fees were hardcoded
-- columns specific to Admishine's admissions use case. Other orgs have totally
-- different revenue concepts (deposit, retainer, MRR, etc.). This migration
-- moves the data into custom_data and lets each org define its own revenue
-- fields via Settings → Lead Fields with the new "currency" field type.
--
-- Pattern matches migration 008 — idempotent, custom_data wins for existing keys.

-- 1. Backfill: copy column values into custom_data (custom_data takes precedence
--    over columns for existing keys, so re-running is safe).
update leads
set custom_data = jsonb_strip_nulls(jsonb_build_object(
  'application_fees', application_fees,
  'booking_fees',     booking_fees,
  'tuition_fees',     tuition_fees
)) || coalesce(custom_data, '{}'::jsonb)
where application_fees is not null or booking_fees is not null or tuition_fees is not null;

-- 2. For Admishine specifically: ensure its org_field_layouts has a "Payments"
--    section with the 3 fields as currency type. Other orgs start blank and
--    define their own revenue fields via the Lead Fields settings UI.
do $$
declare
  ad_org_id uuid;
  pay_exists boolean;
  next_pos int;
begin
  select id into ad_org_id from orgs where slug = 'admishine' limit 1;

  if ad_org_id is not null then
    select exists(
      select 1 from org_field_layouts
      where org_id = ad_org_id and section_name = 'Payments'
    ) into pay_exists;

    if not pay_exists then
      select coalesce(max(position), -1) + 1 into next_pos
      from org_field_layouts where org_id = ad_org_id;

      insert into org_field_layouts (org_id, section_name, position, fields)
      values (
        ad_org_id,
        'Payments',
        next_pos,
        jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'key', 'application_fees',
            'label', 'Application Fees',
            'type', 'currency',
            'required', false, 'placeholder', '0',
            'options', '[]'::jsonb, 'formula', '', 'position', 0
          ),
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'key', 'booking_fees',
            'label', 'Booking Fees',
            'type', 'currency',
            'required', false, 'placeholder', '0',
            'options', '[]'::jsonb, 'formula', '', 'position', 1
          ),
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'key', 'tuition_fees',
            'label', 'Tuition Fees',
            'type', 'currency',
            'required', false, 'placeholder', '0',
            'options', '[]'::jsonb, 'formula', '', 'position', 2
          )
        )
      );
    end if;
  end if;
end $$;

-- 3. Drop the columns now that data is safely in custom_data.
--    Code is backwards-compatible (lfn() reads from either) so this can run any time.
alter table leads drop column if exists application_fees;
alter table leads drop column if exists booking_fees;
alter table leads drop column if exists tuition_fees;
