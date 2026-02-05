-- =============================================================================
-- Schedule sync-strava-activities and process-activities (pg_cron + pg_net)
-- Run once in Supabase SQL Editor after replacing placeholders below.
--
-- IF CRON DIDN'T RUN AUTOMATICALLY:
-- 1. Ensure pg_net is enabled (run the line below, or apply migration 14_enable_pg_net).
-- 2. Run this ENTIRE script in SQL Editor with PROJECT_REF and SERVICE_ROLE_KEY
--    replaced (search for PROJECT_REF and SERVICE_ROLE_KEY in this file).
-- 3. Verify:  select jobname, schedule from cron.job;
--    You should see sync-strava (0 * * * *) and process-activities (15 * * * *).
--
-- Default: HOURLY (sync at :00, process at :15).
-- To run ONCE PER DAY: change both cron expressions to '0 0 * * *' and
-- '15 0 * * *' (midnight UTC and 00:15 UTC).
--
-- Where to get values:
--   PROJECT_REF = from your Supabase URL (e.g. https://tqzxzdbpavboydgewqlz.supabase.co -> tqzxzdbpavboydgewqlz).
--   SERVICE_ROLE_KEY = Project Settings -> API -> service_role (secret).
-- =============================================================================

-- Ensure pg_net is available (required for net.http_post)
create extension if not exists pg_net;

-- Unschedule existing jobs by name (idempotent)
do $$
declare
  r record;
begin
  for r in select jobid, jobname from cron.job where jobname in ('sync-strava', 'process-activities')
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end
$$;

-- Sync Strava activities every hour at :00
-- Replace PROJECT_REF and SERVICE_ROLE_KEY with your values before running.
select cron.schedule(
  'sync-strava',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/sync-strava-activities',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- Process activities every hour at :15 (after sync)
select cron.schedule(
  'process-activities',
  '15 * * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/process-activities',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
