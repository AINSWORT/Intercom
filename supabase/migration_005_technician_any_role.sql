-- Corrige migration_004: el permiso de editar/eliminar un cliente debe
-- depender solo de que tu email coincida con clients.technician_email,
-- sin importar tu rol de sistema (un admin también puede aparecer como
-- "Técnico encargado" de un cliente que no creó él mismo).
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
    where id = auth.uid() and email = client_tech_email
  );
$$;
