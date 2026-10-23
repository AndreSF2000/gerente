-- Mr Pizza — Horários da equipa
-- Executar uma vez no Supabase: SQL Editor → New query → Run.

create table if not exists public.mr_pizza_schedule (
  id integer primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- A tabela é privada. Só o servidor do site (secret key) lhe acede.
alter table public.mr_pizza_schedule enable row level security;

revoke all on table public.mr_pizza_schedule from anon, authenticated;
grant all on table public.mr_pizza_schedule to service_role;

comment on table public.mr_pizza_schedule is
  'Estado do gestor de horários Mr Pizza (equipa, turnos e definições).';
