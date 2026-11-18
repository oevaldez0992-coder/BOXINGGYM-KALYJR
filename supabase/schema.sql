-- =====================================================================
--  GYMBOXING KALY JR · Esquema de base de datos (Supabase / Postgres)
--  Pega TODO este archivo en Supabase → SQL Editor → Run.
--  Es seguro ejecutarlo más de una vez.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Planes / membresías
-- ---------------------------------------------------------------------
create table if not exists public.planes (
  id            bigint generated always as identity primary key,
  nombre        text        not null,
  precio        numeric(10,2) not null check (precio >= 0),
  duracion_dias integer     not null check (duracion_dias > 0),
  activo        boolean     not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Socios
-- ---------------------------------------------------------------------
create table if not exists public.socios (
  id                   bigint generated always as identity primary key,
  nombre               text        not null,
  apellidos            text        not null default '',
  telefono             text        not null default '',
  email                text        not null default '',
  fecha_nacimiento     date,
  nivel                text        not null default 'principiante'
                       check (nivel in ('principiante','intermedio','avanzado','competidor')),
  peso_kg              numeric(5,1),
  contacto_emergencia  text        not null default '',
  telefono_emergencia  text        not null default '',
  notas                text        not null default '',
  activo               boolean     not null default true,
  fecha_alta           date        not null default (now() at time zone 'America/Mexico_City')::date,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Pagos (cada pago cubre un periodo inicio → fin)
-- ---------------------------------------------------------------------
create table if not exists public.pagos (
  id             bigint generated always as identity primary key,
  socio_id       bigint      not null references public.socios(id) on delete cascade,
  plan_id        bigint      references public.planes(id) on delete set null,
  concepto       text        not null default '',
  monto          numeric(10,2) not null check (monto >= 0),
  metodo         text        not null default 'efectivo'
                 check (metodo in ('efectivo','tarjeta','transferencia')),
  fecha_pago     date        not null default (now() at time zone 'America/Mexico_City')::date,
  periodo_inicio date        not null,
  periodo_fin    date        not null,
  notas          text        not null default '',
  created_at     timestamptz not null default now(),
  check (periodo_fin >= periodo_inicio)
);
create index if not exists pagos_socio_idx on public.pagos (socio_id, periodo_fin desc);
create index if not exists pagos_fecha_idx on public.pagos (fecha_pago);

-- ---------------------------------------------------------------------
-- Asistencias (una por socio por día)
-- ---------------------------------------------------------------------
create table if not exists public.asistencias (
  id          bigint generated always as identity primary key,
  socio_id    bigint      not null references public.socios(id) on delete cascade,
  fecha       date        not null default (now() at time zone 'America/Mexico_City')::date,
  hora        timestamptz not null default now(),
  unique (socio_id, fecha)
);
create index if not exists asistencias_fecha_idx on public.asistencias (fecha);

-- ---------------------------------------------------------------------
-- Reservas del rin (sparring). No se permiten horarios encimados.
-- ---------------------------------------------------------------------
create table if not exists public.reservas_rin (
  id           bigint generated always as identity primary key,
  fecha        date        not null,
  hora_inicio  time        not null,
  hora_fin     time        not null,
  socio_a      bigint      not null references public.socios(id) on delete cascade,
  socio_b      bigint      references public.socios(id) on delete set null,
  entrenador   text        not null default '',
  rounds       integer     check (rounds is null or rounds > 0),
  notas        text        not null default '',
  estado       text        not null default 'reservada'
               check (estado in ('reservada','completada','cancelada')),
  created_at   timestamptz not null default now(),
  check (hora_fin > hora_inicio),
  check (socio_b is null or socio_b <> socio_a)
);
create index if not exists reservas_fecha_idx on public.reservas_rin (fecha);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reservas_rin_sin_traslape') then
    alter table public.reservas_rin
      add constraint reservas_rin_sin_traslape
      exclude using gist (
        fecha with =,
        tsrange(('2000-01-01'::date + hora_inicio), ('2000-01-01'::date + hora_fin)) with &&
      ) where (estado <> 'cancelada');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Vista: estado de membresía de cada socio
-- ---------------------------------------------------------------------
create or replace view public.socios_estado
with (security_invoker = true) as
select
  s.*,
  v.vencimiento,
  case
    when v.vencimiento is null then 'sin_pago'
    when v.vencimiento < hoy.d then 'vencido'
    when v.vencimiento <= hoy.d + 7 then 'por_vencer'
    else 'al_corriente'
  end as estado_membresia,
  (v.vencimiento - hoy.d) as dias_restantes,
  ua.ultima_asistencia
from public.socios s
cross join (select (now() at time zone 'America/Mexico_City')::date as d) hoy
left join lateral (
  select max(p.periodo_fin) as vencimiento from public.pagos p where p.socio_id = s.id
) v on true
left join lateral (
  select max(a.fecha) as ultima_asistencia from public.asistencias a where a.socio_id = s.id
) ua on true;

-- ---------------------------------------------------------------------
-- Seguridad (RLS): solo usuarios con sesión iniciada (el staff del gym)
-- ---------------------------------------------------------------------
alter table public.planes       enable row level security;
alter table public.socios       enable row level security;
alter table public.pagos        enable row level security;
alter table public.asistencias  enable row level security;
alter table public.reservas_rin enable row level security;

do $$
declare t text;
begin
  foreach t in array array['planes','socios','pagos','asistencias','reservas_rin'] loop
    execute format('drop policy if exists "staff_todo" on public.%I', t);
    execute format(
      'create policy "staff_todo" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

revoke all on public.planes, public.socios, public.pagos, public.asistencias, public.reservas_rin, public.socios_estado from anon;
grant select, insert, update, delete on public.planes, public.socios, public.pagos, public.asistencias, public.reservas_rin to authenticated;
grant select on public.socios_estado to authenticated;

-- ---------------------------------------------------------------------
-- Planes de ejemplo (puedes editarlos desde la app en "Planes")
-- ---------------------------------------------------------------------
insert into public.planes (nombre, precio, duracion_dias)
select * from (values
  ('Visita',        100.00,   1),
  ('Semana',        300.00,   7),
  ('Mensualidad',   700.00,  30),
  ('Trimestre',    1900.00,  90)
) as v(nombre, precio, duracion_dias)
where not exists (select 1 from public.planes);
