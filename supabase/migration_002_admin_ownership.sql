-- Migración: los admins solo pueden modificar/eliminar los clientes y
-- antenas que ellos mismos crearon. El superadmin puede modificar
-- cualquiera, sin excepción.
-- Pégalo completo en el SQL Editor de Supabase y dale Run.

-- 1) Columna de propietario en ambas tablas
alter table public.antennas add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.clients add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- 2) Trigger que fija created_by al usuario que hace el INSERT,
--    ignorando cualquier valor que mande el cliente.
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

-- 3) Reemplazar políticas de update/delete por versiones que exigen
--    ser dueño del registro (o superadmin)
drop policy if exists "antennas_update_admin" on public.antennas;
drop policy if exists "antennas_delete_admin" on public.antennas;
drop policy if exists "clients_update_admin" on public.clients;
drop policy if exists "clients_delete_admin" on public.clients;

create policy "antennas_update_owner" on public.antennas
  for update to authenticated using (
    public.is_superadmin() or (public.is_admin_or_above() and created_by = auth.uid())
  );

create policy "antennas_delete_owner" on public.antennas
  for delete to authenticated using (
    public.is_superadmin() or (public.is_admin_or_above() and created_by = auth.uid())
  );

create policy "clients_update_owner" on public.clients
  for update to authenticated using (
    public.is_superadmin() or (public.is_admin_or_above() and created_by = auth.uid())
  );

create policy "clients_delete_owner" on public.clients
  for delete to authenticated using (
    public.is_superadmin() or (public.is_admin_or_above() and created_by = auth.uid())
  );

-- 4) Antenas/clientes que ya existan sin dueño (created_by NULL) solo
--    podrán ser editados por el superadmin hasta que alguien los
--    reasigne. Si quieres que un admin en particular sea el dueño de
--    los registros ya creados, corre esto reemplazando el correo y la
--    tabla:
--
-- update public.clients set created_by = (select id from public.profiles where email = 'admin@ejemplo.com') where created_by is null;
-- update public.antennas set created_by = (select id from public.profiles where email = 'admin@ejemplo.com') where created_by is null;
