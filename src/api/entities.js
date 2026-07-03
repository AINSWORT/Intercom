import { supabase } from '@/lib/supabaseClient';

const PAGE_SIZE = 1000;

function createEntity(table) {
  return {
    // Supabase/PostgREST limita cada respuesta a PAGE_SIZE filas por defecto,
    // así que paginamos con .range() hasta traer todo. Se ordena siempre
    // (por defecto por "id") para que la paginación sea determinística;
    // sin un order explícito, una fila puede cambiar de página entre
    // llamadas (p. ej. tras un UPDATE) y "desaparecer" de la lista.
    async list(order) {
      const desc = order?.startsWith('-');
      const column = order ? (desc ? order.slice(1) : order) : 'id';
      const ascending = !desc;

      let all = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order(column, { ascending })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        all = all.concat(data);
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return all;
    },
    async filter(match) {
      let all = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .match(match)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        all = all.concat(data);
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return all;
    },
    async create(values) {
      const { data, error } = await supabase.from(table).insert(values).select().single();
      if (error) throw error;
      return data;
    },
    async update(id, values) {
      const { data, error } = await supabase.from(table).update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

export const Client = createEntity('clients');
export const Antenna = createEntity('antennas');
export const Payment = createEntity('payments');
export const Profile = createEntity('profiles');
