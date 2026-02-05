-- Cron audit trail: when each cron-triggered job ran and outcome

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

alter table cron_audit_logs enable row level security;

drop policy if exists "cron_audit_admin_read" on cron_audit_logs;
create policy "cron_audit_admin_read"
  on cron_audit_logs for select
  using (auth.jwt() ->> 'role' = 'admin');
