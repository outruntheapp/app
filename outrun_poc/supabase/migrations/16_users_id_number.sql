-- Add id_number to users (e.g. national/ID number from sign-up)
alter table public.users add column if not exists id_number text null;

comment on column public.users.id_number is 'ID number from sign-up (e.g. national ID).';
