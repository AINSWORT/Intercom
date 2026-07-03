-- NetTrack Pro - esquema inicial de Supabase
-- Ejecutar completo en: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Modelo de roles (3 niveles):
--   superadmin -> control total, incluido ascender/degradar a otros admins y superadmins
--   admin      -> CRUD de clientes/antenas/pagos e invita técnicos; no puede tocar roles
--   usuario    -> técnico de campo; solo lee datos y registra pagos

-- ============================================================
-- Tablas
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'usuario' check (role in ('superadmin', 'admin', 'usuario')),
  created_at timestamptz not null default now()
);

create table if not exists public.antennas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  type text not null default 'Sectorial',
  status text not null default 'Activa',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  address text not null,
  antenna_id uuid references public.antennas(id) on delete set null,
  technician_email text,
  bank_card_number text,
  monthly_fee numeric,
  plan text,
  status text not null default 'Activo',
  installation_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  amount numeric not null,
  method text,
  payment_date date,
  notes text,
  created_at timestamptz not null default now(),
  unique (client_id, year, month)
);

-- ============================================================
-- Perfil automático al registrarse (trigger sobre auth.users)
-- Siempre nace con role='usuario', SIN IMPORTAR lo que venga en
-- options.data del signUp. El signUp es una API pública: si el trigger
-- confiara en un "role" mandado por el cliente, cualquiera podría
-- crearse una cuenta admin/superadmin llamando directo a la API.
-- Solo un superadmin puede ascender un perfil después (ver más abajo).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'usuario'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Helpers de rol
-- ============================================================

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;

create or replace function public.is_admin_or_above()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

-- Bloquea cambios de rol salvo que quien los haga sea superadmin.
-- Así, un admin puede editar su propio nombre pero nunca su rol ni el
-- de nadie más; y un usuario no puede auto-ascenderse llamando a la
-- API de PostgREST directamente.
create or replace function public.protect_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = old.role then
    return new;
  end if;

  if public.is_superadmin() then
    return new;
  end if;

  raise exception 'No tienes permisos para cambiar roles';
end;
$$;

drop trigger if exists protect_role_change_trigger on public.profiles;
create trigger protect_role_change_trigger
  before update on public.profiles
  for each row execute procedure public.protect_role_change();

-- Fija created_by al usuario que hace el INSERT, ignorando cualquier
-- valor que mande el cliente (así nadie puede "regalarle" la propiedad
-- de un registro a otro usuario llamando directo a la API).
create or replace function public.set_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists set_antennas_created_by on public.antennas;
create trigger set_antennas_created_by
  before insert on public.antennas
  for each row execute procedure public.set_created_by();

drop trigger if exists set_clients_created_by on public.clients;
create trigger set_clients_created_by
  before insert on public.clients
  for each row execute procedure public.set_created_by();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.antennas enable row level security;
alter table public.clients enable row level security;
alter table public.payments enable row level security;

-- profiles: cualquier autenticado puede leer todos los perfiles (se
-- necesita para listar técnicos). Cada quien puede actualizar su
-- propio perfil (nombre, etc. - el rol queda protegido por el trigger
-- de arriba); un superadmin puede actualizar cualquier perfil.
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_self" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "profiles_update_superadmin" on public.profiles
  for update to authenticated using (public.is_superadmin());

-- antennas: lectura para cualquier autenticado. Cualquier admin o
-- superadmin puede crear. Modificar/eliminar: un admin solo puede
-- tocar las antenas que él mismo creó (created_by = su id); el
-- superadmin puede tocar cualquiera, sin excepción.
create policy "antennas_select_authenticated" on public.antennas
  for select to authenticated using (true);

create policy "antennas_write_admin" on public.antennas
  for insert to authenticated with check (public.is_admin_or_above());

create policy "antennas_update_owner" on public.antennas
  for update to authenticated using (
    public.is_superadmin() or (public.is_admin_or_above() and created_by = auth.uid())
  );

create policy "antennas_delete_owner" on public.antennas
  for delete to authenticated using (
    public.is_superadmin() or (public.is_admin_or_above() and created_by = auth.uid())
  );

-- clients: mismo esquema que antennas.
create policy "clients_select_authenticated" on public.clients
  for select to authenticated using (true);

create policy "clients_write_admin" on public.clients
  for insert to authenticated with check (public.is_admin_or_above());

create policy "clients_update_owner" on public.clients
  for update to authenticated using (
    public.is_superadmin() or (public.is_admin_or_above() and created_by = auth.uid())
  );

create policy "clients_delete_owner" on public.clients
  for delete to authenticated using (
    public.is_superadmin() or (public.is_admin_or_above() and created_by = auth.uid())
  );

-- payments: cualquier autenticado (superadmin, admin o técnico) puede
-- registrar y eliminar pagos, igual que en la app original.
create policy "payments_select_authenticated" on public.payments
  for select to authenticated using (true);

create policy "payments_write_authenticated" on public.payments
  for insert to authenticated with check (true);

create policy "payments_delete_authenticated" on public.payments
  for delete to authenticated using (true);

-- ============================================================
-- Primer superadmin
-- ============================================================
-- Después de registrar tu primera cuenta desde la app (login -> "Regístrate"),
-- ejecuta esto una sola vez reemplazando el correo:
--
-- update public.profiles set role = 'superadmin' where email = 'tu-correo@ejemplo.com';
