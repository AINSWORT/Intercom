-- Permite que un técnico (role='usuario') edite o elimine los clientes que
-- tiene asignados (clients.technician_email = su propio email), sin importar
-- quién los creó. Son políticas adicionales: en Postgres, varias políticas
-- permisivas para la misma operación se combinan con OR, así que esto no
-- reemplaza ni afecta los permisos de superadmin/admin ya existentes.
-- Pégalo completo en el SQL Editor de Supabase y dale Run.

create or replace function public.is_assigned_technician(client_tech_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'usuario' and email = client_tech_email
  );
$$;

create policy "clients_update_technician" on public.clients
  for update to authenticated using (public.is_assigned_technician(technician_email));

create policy "clients_delete_technician" on public.clients
  for delete to authenticated using (public.is_assigned_technician(technician_email));
