-- OUTRUN POC - Complete Database Schema
-- Run this file in Supabase SQL Editor to set up the entire database

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";
create extension if not exists "postgis";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users (synced from Supabase Auth)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  strava_athlete_id bigint unique,
  full_name text,
  sex text,
  created_at timestamptz default now()
);

-- Challenges
create table if not exists challenges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean default false,
  created_at timestamptz default now()
);

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
  buffer_meters integer default 30,
  min_overlap_ratio numeric default 0.8
);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Overall Leaderboard
create or replace view leaderboard_overall as
select
  u.id as user_id,
  u.full_name,
  u.sex,
  sum(sr.best_time_seconds) as total_time_seconds,
  count(sr.stage_number) as stages_completed
from stage_results sr
join users u on u.id = sr.user_id
join participants p on p.user_id = u.id
where p.excluded = false
group by u.id, u.full_name, u.sex;

-- Per-Stage Leaderboard
create or replace view leaderboard_stage as
select
  sr.stage_number,
  u.id as user_id,
  u.full_name,
  sr.best_time_seconds
from stage_results sr
join users u on u.id = sr.user_id
join participants p on p.user_id = u.id
where p.excluded = false;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
alter table users enable row level security;
alter table participants enable row level security;
alter table activities enable row level security;
alter table stage_results enable row level security;
alter table audit_logs enable row level security;
alter table strava_tokens enable row level security;

-- Drop existing policies if they exist (for idempotency)
drop policy if exists "users_read_self" on users;
drop policy if exists "participants_read" on participants;
drop policy if exists "participants_admin_update" on participants;
drop policy if exists "activities_user_access" on activities;
drop policy if exists "stage_results_read" on stage_results;
drop policy if exists "audit_admin_only" on audit_logs;
drop policy if exists "service_only" on strava_tokens;

-- Users — self-read only
create policy "users_read_self"
on users for select
using (id = auth.uid());

-- Participants — read self, admins update
create policy "participants_read"
on participants for select
using (user_id = auth.uid());

create policy "participants_admin_update"
on participants for update
using (auth.jwt() ->> 'role' = 'admin');

-- Activities — user owns data
create policy "activities_user_access"
on activities for all
using (user_id = auth.uid());

-- Stage results — read-only for users
create policy "stage_results_read"
on stage_results for select
using (user_id = auth.uid());

-- Audit logs — admin only
create policy "audit_admin_only"
on audit_logs for select
using (auth.jwt() ->> 'role' = 'admin');

-- Strava Tokens — service only (no public access)
create policy "service_only"
on strava_tokens
for all
using (false);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Audit Trigger for Participant Exclusion
create or replace function log_participant_exclusion()
returns trigger as $$
begin
  if new.excluded = true and old.excluded = false then
    insert into audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) values (
      auth.uid(),
      'EXCLUDE_PARTICIPANT',
      'participant',
      new.id,
      jsonb_build_object('user_id', new.user_id)
    );
  end if;
  return new;
end;
$$ language plpgsql;

-- Drop trigger if exists (for idempotency)
drop trigger if exists participant_exclusion_audit on participants;

create trigger participant_exclusion_audit
after update on participants
for each row
execute function log_participant_exclusion();
