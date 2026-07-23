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

-- Tarifas editables desde /admin/tarifas (fila única id=1).
-- extra_guest_fee se guarda pero AÚN no se aplica al cálculo (tarifa plana).
create table if not exists public.rate_settings (
  id              smallint primary key default 1 check (id = 1),
  nightly_yvyra   integer not null default 200000,
  nightly_mberu   integer not null default 200000,
  nightly_tatu    integer not null default 130000,
  cleaning_fee    integer not null default 30000,
  base_guests     integer not null default 4,
  extra_guest_fee integer not null default 0,
  updated_at      timestamptz not null default now()
);

-- Fila inicial con los mismos valores que lib/units.ts
insert into public.rate_settings (id) values (1) on conflict (id) do nothing;

-- Mismo criterio que reservations: RLS sin policies, solo service role.
alter table public.rate_settings enable row level security;

drop trigger if exists rate_settings_set_updated_at on public.rate_settings;
create trigger rate_settings_set_updated_at
  before update on public.rate_settings
  for each row execute function public.set_updated_at();

-- Precios por método de pago (2026-07-20): % de costo por canal, editables en
-- /admin/tarifas. El precio público = neto ÷ (1 − pct/100) (ver method-pricing.ts).
-- Para bases que ya tienen rate_settings creada, este ALTER agrega las columnas.
alter table public.rate_settings
  add column if not exists card_fee_pct     numeric(5,2) not null default 7.7,
  add column if not exists transfer_fee_pct numeric(5,2) not null default 5;

-- Configuración operativa del sitio (2026-07-23), editable desde
-- /admin/configuracion. Fila única id=1, mismo criterio que rate_settings.
-- booking_mode='whatsapp' pausa la reserva online: los CTAs derivan a WhatsApp,
-- /reservas redirige a /tarifas y los APIs de pago responden 503.
create table if not exists public.site_settings (
  id           smallint primary key default 1 check (id = 1),
  booking_mode text not null default 'whatsapp'
               check (booking_mode in ('whatsapp', 'online')),
  updated_at   timestamptz not null default now()
);

-- Fila inicial en el modo CERRADO: abrir el cobro es siempre una acción explícita.
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- RLS sin policies: solo la service role key (server-only) entra.
alter table public.site_settings enable row level security;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();
