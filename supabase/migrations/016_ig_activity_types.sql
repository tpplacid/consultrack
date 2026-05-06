-- Allow IG-specific activity types so repeat DMs / comments / mentions
-- can be logged on the existing lead's activity feed. Without this, the
-- check constraint set in 001_schema.sql rejects the inserts.

alter table activities drop constraint if exists activities_activity_type_check;

alter table activities add constraint activities_activity_type_check check (
  activity_type in (
    'stage_change',
    'comment',
    'field_update',
    'call_log',
    'whatsapp_sent',
    'lead_created',
    'ig_dm_received',
    'ig_comment_received',
    'ig_mention_received'
  )
);
