import { supabase } from '@/lib/supabaseClient';

function createEntity(table) {
  return {
    async list(order) {
      let query = supabase.from(table).select('*');
      if (order) {
        const desc = order.startsWith('-');
        const column = desc ? order.slice(1) : order;
        query = query.order(column, { ascending: !desc });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    async filter(match) {
      const { data, error } = await supabase.from(table).select('*').match(match);
      if (error) throw error;
      return data;
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
