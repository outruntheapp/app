-- Add email and role to users. Role is set manually in table; clients cannot set themselves admin.

-- Add columns if not present
alter table users add column if not exists email text;
alter table users add column if not exists role text not null default 'participant';

-- Unique on email (allows multiple nulls in PostgreSQL)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_email_key'
  ) then
    alter table users add constraint users_email_key unique (email);
  end if;
end $$;

-- Comment: set users.role = 'admin' manually in table for admin access; clients cannot change role.
comment on column users.role is 'Set by dev in table; admin grants access to Admin page. Default participant.';
