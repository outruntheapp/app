-- Racepass ticket validation: store allowed ticket holders per challenge.
-- Gating: only users in this table (or users.role = 'admin') can be added as participants.

create table if not exists public.challenge_ticket_holders (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  email text not null,
  name text,
  rsa_id text,
  source text not null default 'entry_ninja_csv',
  created_at timestamptz not null default now(),
  constraint challenge_ticket_holders_challenge_email_key unique (challenge_id, email)
);

create index if not exists idx_challenge_ticket_holders_lookup
  on public.challenge_ticket_holders (challenge_id, email);

alter table public.challenge_ticket_holders enable row level security;

-- Only service role (admin API) can manage; no direct client access
create policy "challenge_ticket_holders_service_only"
  on public.challenge_ticket_holders
  for all
  using (false)
  with check (false);

comment on table public.challenge_ticket_holders is 'Allowed ticket holders per challenge (e.g. Racepass CSV). Used to gate participant creation. Admins (users.role = admin) bypass.';
