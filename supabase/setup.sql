-- =============================================================
-- Aruma Lodge — setup completo de Supabase
-- Pegar en: Dashboard → SQL Editor → New query → Run
-- Replica exacta del esquema original (proyecto dckpnzkvuzrajvakiusc)
-- =============================================================

-- Trigger function: mantiene updated_at al día en cada UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Tabla principal de reservas
create table if not exists public.reservations (
  id                          uuid primary key default gen_random_uuid(),
  code                        text not null unique,
  unit_id                     text not null,
  unit_name                   text not null,
  check_in                    date not null,
  check_out                   date not null,
  nights                      integer not null,
  guests                      integer not null,
  first_name                  text not null,
  last_name                   text not null,
  email                       text not null,
  phone                       text,
  locale                      text not null default 'es',
  confirmation_email_sent_at  timestamptz,
  total                       integer not null,
  payment_method              text not null check (payment_method in ('card', 'transfer')),
  status                      text not null check (status in ('pending', 'confirmed', 'released')),
  comprobante_path            text,
  payment_id                  text,
  calendar_event_id           text,
  created_at                  timestamptz not null default now(),
  confirmed_at                timestamptz,
  updated_at                  timestamptz not null default now()
);

-- Índice para el listado del panel admin (filtro por status + orden por fecha)
create index if not exists reservations_status_idx
  on public.reservations (status, created_at desc);

-- RLS activado sin policies: nadie accede con la anon key.
-- La app usa la service role key (server-only), que ignora RLS.
alter table public.reservations enable row level security;

-- Trigger de updated_at
drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- Bucket privado para comprobantes de transferencia
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;
