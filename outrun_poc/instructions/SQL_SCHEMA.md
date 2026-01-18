# 2️⃣ Supabase Schema + Views + RLS + Audit Triggers

Below is **one coherent SQL set** you can apply incrementally.

---

## 🔹 Extensions

```sql
create extension if not exists "uuid-ossp";
````

---

## 🔹 Core Tables

### Users (synced from Supabase Auth)

```sql
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  strava_athlete_id bigint unique,
  full_name text,
  sex text,
  created_at timestamptz default now()
);
```

---

### Challenges

```sql
create table challenges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean default false,
  created_at timestamptz default now()
);
```

---

### Participants

```sql
create table participants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  challenge_id uuid references challenges(id),
  excluded boolean default false,
  created_at timestamptz default now(),
  unique (user_id, challenge_id)
);
```

---

### Activities (raw Strava ingestion)

```sql
create table activities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  strava_activity_id bigint unique,
  activity_type text,
  started_at timestamptz,
  elapsed_seconds integer,
  polyline text,
  created_at timestamptz default now(),
  processed_at timestamptz;
);
```

---

### Stage Results (derived, one row per stage per user)

```sql
create table stage_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  challenge_id uuid references challenges(id),
  stage_number integer,
  best_time_seconds integer,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, challenge_id, stage_number)
);
```

---

## 🔹 Audit Logs (Append-only)

```sql
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);
```

---

## 🔹 Leaderboard Views (Derived Only)

### Overall Leaderboard

```sql
create view leaderboard_overall as
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
```

---

### Per-Stage Leaderboard

```sql
create view leaderboard_stage as
select
  sr.stage_number,
  u.id as user_id,
  u.full_name,
  sr.best_time_seconds
from stage_results sr
join users u on u.id = sr.user_id
join participants p on p.user_id = u.id
where p.excluded = false;
```
---
### Strava Tokens

```sql
-- Purpose: Secure storage of Strava OAuth tokens

create table strava_tokens (
  user_id uuid primary key references users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

```
---

### Routes

```sql
-- Purpose: Official GPX routes per stage

create table routes (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid references challenges(id),
  stage_number integer not null,
  gpx_geo geography(LineString, 4326),
  buffer_meters integer default 30,
  min_overlap_ratio numeric default 0.8
);

```

---

## 🔹 Row Level Security (RLS)

### Enable RLS

```sql
alter table users enable row level security;
alter table participants enable row level security;
alter table activities enable row level security;
alter table stage_results enable row level security;
alter table audit_logs enable row level security;
alter table strava_tokens enable row level security;
```

---

### Policies

#### Users — self-read only

```sql
create policy "users_read_self"
on users for select
using (id = auth.uid());
```

---

#### Participants — read self, admins update

```sql
create policy "participants_read"
on participants for select
using (user_id = auth.uid());

create policy "participants_admin_update"
on participants for update
using (auth.jwt() ->> 'role' = 'admin');
```

---

#### Activities — user owns data

```sql
create policy "activities_user_access"
on activities for all
using (user_id = auth.uid());
```

---

#### Stage results — read-only for users

```sql
create policy "stage_results_read"
on stage_results for select
using (user_id = auth.uid());
```

---

#### Audit logs — admin only

```sql
create policy "audit_admin_only"
on audit_logs for select
using (auth.jwt() ->> 'role' = 'admin');
```

---

## 🔹 Audit Trigger (Admin Actions)

```sql
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
```

```sql
create trigger participant_exclusion_audit
after update on participants
for each row
execute function log_participant_exclusion();
```
### Strava Tokens

```sql
create policy "service_only"
on strava_tokens
for all
using (false);
```