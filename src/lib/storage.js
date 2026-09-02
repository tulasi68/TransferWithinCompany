// src/lib/storage.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// One table: kv_store(key text primary key, value text, shared boolean)
window.storage = {
  async get(key) {
    const { data, error } = await supabase.from('kv_store').select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    return data ? { key, value: data.value, shared: true } : null;
  },
  async set(key, value) {
    const { error } = await supabase.from('kv_store').upsert({ key, value });
    if (error) throw error;
    return { key, value, shared: true };
  },
  async delete(key) {
    const { error } = await supabase.from('kv_store').delete().eq('key', key);
    if (error) throw error;
    return { key, deleted: true, shared: true };
  },
  async list(prefix) {
    const { data, error } = await supabase.from('kv_store').select('key').like('key', `${prefix}%`);
    if (error) throw error;
    return { keys: data.map(r => r.key), shared: true };
  },
};
