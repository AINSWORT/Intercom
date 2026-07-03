-- Migración: pasa de 2 roles (admin/tecnico) a 3 roles (superadmin/admin/usuario).
-- Solo necesitas correr esto UNA VEZ, en un proyecto donde ya ejecutaste
-- el schema.sql viejo. Pégalo completo en el SQL Editor de Supabase y dale Run.
--
-- Al final, deja tu cuenta (arcd2216@gmail.com) como superadmin.

-- 1) Quitar políticas viejas que dependen de la función is_admin() (se van a recrear)
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "antennas_write_admin" on public.antennas;
drop policy if exists "antennas_update_admin" on public.antennas;
drop policy if exists "antennas_delete_admin" on public.antennas;
drop policy if exists "clients_write_admin" on public.clients;
drop policy if exists "clients_update_admin" on public.clients;
drop policy if exists "clients_delete_admin" on public.clients;

drop function if exists public.is_admin();

-- 2) Renombrar el rol 'tecnico' -> 'usuario' en los datos existentes
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles alter column role drop default;
update public.profiles set role = 'usuario' where role = 'tecnico';
alter table public.profiles
  add constraint profiles_role_check check (role in ('superadmin', 'admin', 'usuario'));
alter table public.profiles alter column role set default 'usuario';

-- 3) Trigger de creación de perfil: ya no confía en el "role" que mande el
--    cliente en signUp (cualquiera podría llamar la API pública con
--    role: 'admin'). Todo usuario nuevo nace 'usuario'.
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

-- 4) Helpers de rol nuevos
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

-- 5) Trigger que bloquea cambios de rol salvo que quien los haga sea superadmin
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

-- 6) Recrear políticas usando los helpers nuevos
create policy "profiles_update_superadmin" on public.profiles
  for update to authenticated using (public.is_superadmin());

create policy "antennas_write_admin" on public.antennas
  for insert to authenticated with check (public.is_admin_or_above());

create policy "antennas_update_admin" on public.antennas
  for update to authenticated using (public.is_admin_or_above());

create policy "antennas_delete_admin" on public.antennas
  for delete to authenticated using (public.is_admin_or_above());

create policy "clients_write_admin" on public.clients
  for insert to authenticated with check (public.is_admin_or_above());

create policy "clients_update_admin" on public.clients
  for update to authenticated using (public.is_admin_or_above());

create policy "clients_delete_admin" on public.clients
  for delete to authenticated using (public.is_admin_or_above());

-- 7) Tu cuenta pasa a superadmin
-- (se desactiva el trigger un instante: al correr esto desde el SQL Editor
-- no hay sesión autenticada, así que auth.uid() es nulo y protect_role_change
-- lo bloquearía aunque seas tú mismo el dueño del proyecto)
alter table public.profiles disable trigger protect_role_change_trigger;
update public.profiles set role = 'superadmin' where email = 'arcd2216@gmail.com';
alter table public.profiles enable trigger protect_role_change_trigger;
