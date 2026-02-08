-- Rename rsa_id to id_number in challenge_ticket_holders (align with public.users.id_number).

alter table public.challenge_ticket_holders
  rename column rsa_id to id_number;
