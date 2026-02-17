-- OUTRUN POC - Complete Database Schema
-- Run this file in Supabase SQL Editor to set up the entire database from scratch.
-- Matches the final state after all migrations (through 17).

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";
create extension if not exists "postgis";
create extension if not exists "pg_net";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users (synced from Supabase Auth)
create table if not exists public.users (
  id uuid not null,
  strava_athlete_id bigint null,
  full_name text null,
  sex text null,
  created_at timestamp with time zone null default now(),
  email text null,
  role text not null default 'participant'::text,
  id_number text null,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_strava_athlete_id_key unique (strava_athlete_id),
  constraint users_id_fkey foreign key (id) references auth.users (id) on delete cascade
) tablespace pg_default;

comment on column public.users.role is 'Set by dev in table; admin grants access to Admin page. Default participant.';
comment on column public.users.id_number is 'ID number from sign-up (e.g. national ID).';

-- Challenges
create table if not exists challenges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean default false,
  created_at timestamptz default now(),
  slug text not null,
  constraint challenges_slug_unique unique (slug)
);

create unique index if not exists challenges_one_active
  on challenges ((true)) where is_active = true;

-- Participants
create table if not exists participants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  challenge_id uuid references challenges(id),
  excluded boolean default false,
  created_at timestamptz default now(),
  unique (user_id, challenge_id)
);

-- Activities (raw Strava ingestion)
create table if not exists activities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  strava_activity_id bigint unique,
  activity_type text,
  started_at timestamptz,
  elapsed_seconds integer,
  polyline text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

-- Stage Results (derived, one row per stage per user)
create table if not exists stage_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  challenge_id uuid references challenges(id),
  stage_number integer,
  best_time_seconds integer,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, challenge_id, stage_number)
);

-- Audit Logs (Append-only)
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Strava Tokens
create table if not exists strava_tokens (
  user_id uuid primary key references users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Routes
create table if not exists routes (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid references challenges(id),
  stage_number integer not null,
  gpx_geo geography(LineString, 4326),
  polyline text,
  buffer_meters integer default 30,
  min_overlap_ratio numeric default 0.8
);

-- Challenge ticket holders (Racepass CSV; gates participant creation)
create table if not exists public.challenge_ticket_holders (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  email text not null,
  name text,
  id_number text,
  ticket_type text not null default 'basic',
  source text not null default 'entry_ninja_csv',
  created_at timestamptz not null default now(),
  constraint challenge_ticket_holders_challenge_email_key unique (challenge_id, email)
);

create index if not exists idx_challenge_ticket_holders_lookup
  on public.challenge_ticket_holders (challenge_id, email);

comment on column public.challenge_ticket_holders.ticket_type is 'Ticket tier (basic, premium, apex). Used for UI icon display; not used for gating.';
comment on table public.challenge_ticket_holders is 'Allowed ticket holders per challenge (e.g. Racepass CSV). Used to gate participant creation. Admins (users.role = admin) bypass.';

-- Cron audit trail (when each cron job ran)
create table if not exists cron_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null,
  job_name text not null,
  status text not null check (status in ('started', 'completed', 'failed')),
  created_at timestamptz default now(),
  metadata jsonb default '{}'
);

create index if not exists cron_audit_logs_job_created_idx
  on cron_audit_logs(job_name, created_at desc);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Overall Leaderboard (active challenge only)
create or replace view leaderboard_overall as
select
  u.id as user_id,
  u.full_name,
  u.sex,
  sum(sr.best_time_seconds) as total_time_seconds,
  count(sr.stage_number) as stages_completed,
  th.ticket_type
from stage_results sr
join challenges c on c.id = sr.challenge_id and c.is_active = true
join users u on u.id = sr.user_id
join participants p on p.user_id = u.id and p.challenge_id = sr.challenge_id
left join public.challenge_ticket_holders th
  on th.challenge_id = sr.challenge_id
 and lower(th.email) = lower(u.email)
where p.excluded = false
group by u.id, u.full_name, u.sex, th.ticket_type;

-- Per-Stage Leaderboard (active challenge only)
create or replace view leaderboard_stage as
select
  sr.stage_number,
  u.id as user_id,
  u.full_name,
  sr.best_time_seconds,
  u.sex,
  th.ticket_type
from stage_results sr
join challenges c on c.id = sr.challenge_id and c.is_active = true
join users u on u.id = sr.user_id
join participants p on p.user_id = u.id and p.challenge_id = sr.challenge_id
left join public.challenge_ticket_holders th
  on th.challenge_id = sr.challenge_id
 and lower(th.email) = lower(u.email)
where p.excluded = false;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table users enable row level security;
alter table participants enable row level security;
alter table activities enable row level security;
alter table stage_results enable row level security;
alter table audit_logs enable row level security;
alter table strava_tokens enable row level security;
alter table challenges enable row level security;
alter table cron_audit_logs enable row level security;
alter table public.challenge_ticket_holders enable row level security;

drop policy if exists "users_read_self" on users;
drop policy if exists "users_read_leaderboard" on users;
drop policy if exists "participants_read" on participants;
drop policy if exists "participants_read_leaderboard" on participants;
drop policy if exists "participants_admin_update" on participants;
drop policy if exists "activities_user_access" on activities;
drop policy if exists "stage_results_read" on stage_results;
drop policy if exists "stage_results_read_leaderboard" on stage_results;
drop policy if exists "audit_admin_only" on audit_logs;
drop policy if exists "service_only" on strava_tokens;
drop policy if exists "challenges_select" on challenges;
drop policy if exists "cron_audit_admin_read" on cron_audit_logs;
drop policy if exists "challenge_ticket_holders_service_only" on public.challenge_ticket_holders;

-- Users — self-read; authenticated can read all (for leaderboard names)
create policy "users_read_self"
  on users for select
  using (id = auth.uid());

create policy "users_read_leaderboard"
  on users for select
  to authenticated
  using (true);

-- Participants — read self; authenticated read all (leaderboard); admin update
create policy "participants_read"
  on participants for select
  using (user_id = auth.uid());

create policy "participants_read_leaderboard"
  on participants for select
  to authenticated
  using (true);

create policy "participants_admin_update"
  on participants for update
  using (auth.jwt() ->> 'role' = 'admin');

-- Activities — user owns data
create policy "activities_user_access"
  on activities for all
  using (user_id = auth.uid());

-- Stage results — read self; authenticated read all (leaderboard)
create policy "stage_results_read"
  on stage_results for select
  using (user_id = auth.uid());

create policy "stage_results_read_leaderboard"
  on stage_results for select
  to authenticated
  using (true);

-- Audit logs — admin only
create policy "audit_admin_only"
  on audit_logs for select
  using (auth.jwt() ->> 'role' = 'admin');

-- Strava Tokens — service only
create policy "service_only"
  on strava_tokens for all
  using (false);

-- Challenges — read for all
create policy "challenges_select"
  on challenges for select
  using (true);

-- Cron audit logs — admin read
create policy "cron_audit_admin_read"
  on cron_audit_logs for select
  using (auth.jwt() ->> 'role' = 'admin');

-- Challenge ticket holders — service role only (admin API)
create policy "challenge_ticket_holders_service_only"
  on public.challenge_ticket_holders for all
  using (false)
  with check (false);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Check Strava connection by email (hasToken for dashboard)
create or replace function check_strava_connection_by_email(user_email text)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'hasStrava', (u.strava_athlete_id IS NOT NULL),
    'userId', u.id,
    'hasToken', exists(select 1 from strava_tokens st where st.user_id = u.id)
  ) into result
  from users u
  where u.email = lower(trim(user_email))
  limit 1;
  return coalesce(result, '{"hasStrava": false, "userId": null, "hasToken": false}'::jsonb);
end;
$$;
grant execute on function check_strava_connection_by_email(text) to anon, authenticated;

-- Strava connection status for signed-in user
create or replace function get_strava_connection_status()
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'hasStrava', (select (strava_athlete_id IS NOT NULL) from users where id = auth.uid()),
    'hasToken', (select exists(select 1 from strava_tokens where user_id = auth.uid()))
  ) into result;
  return coalesce(result, '{"hasStrava": false, "hasToken": false}'::jsonb);
end;
$$;
grant execute on function get_strava_connection_status() to authenticated;

-- Sync routes from WKT (with polyline for matching)
create or replace function sync_challenge_routes_from_wkt(
  p_challenge_id uuid,
  p_wkt_1 text,
  p_wkt_2 text,
  p_wkt_3 text
)
returns void
language plpgsql
security definer
as $$
begin
  delete from routes
  where challenge_id = p_challenge_id and stage_number in (1, 2, 3);
  if p_wkt_1 is not null and trim(p_wkt_1) != '' then
    insert into routes (challenge_id, stage_number, gpx_geo, polyline, buffer_meters, min_overlap_ratio)
    values (p_challenge_id, 1, ST_GeogFromText(p_wkt_1), ST_AsEncodedPolyline(ST_GeogFromText(p_wkt_1)::geometry, 5), 30, 0.8);
  end if;
  if p_wkt_2 is not null and trim(p_wkt_2) != '' then
    insert into routes (challenge_id, stage_number, gpx_geo, polyline, buffer_meters, min_overlap_ratio)
    values (p_challenge_id, 2, ST_GeogFromText(p_wkt_2), ST_AsEncodedPolyline(ST_GeogFromText(p_wkt_2)::geometry, 5), 30, 0.8);
  end if;
  if p_wkt_3 is not null and trim(p_wkt_3) != '' then
    insert into routes (challenge_id, stage_number, gpx_geo, polyline, buffer_meters, min_overlap_ratio)
    values (p_challenge_id, 3, ST_GeogFromText(p_wkt_3), ST_AsEncodedPolyline(ST_GeogFromText(p_wkt_3)::geometry, 5), 30, 0.8);
  end if;
end;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create or replace function log_participant_exclusion()
returns trigger as $$
begin
  if new.excluded = true and old.excluded = false then
    insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'EXCLUDE_PARTICIPANT', 'participant', new.id, jsonb_build_object('user_id', new.user_id));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists participant_exclusion_audit on participants;
create trigger participant_exclusion_audit
  after update on participants
  for each row
  execute function log_participant_exclusion();
