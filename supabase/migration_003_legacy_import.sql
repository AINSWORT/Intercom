-- Permite importar clientes históricos que no traen dirección capturada.
-- Se completa manualmente desde la app después del import.
alter table public.clients alter column address drop not null;
