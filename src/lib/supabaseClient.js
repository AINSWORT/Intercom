import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Configúralas en tu archivo .env (ver .env.example).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente aislado (sin persistir sesión) para crear cuentas de otros usuarios
// (p. ej. invitar técnicos) sin reemplazar la sesión de quien está autenticado.
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
