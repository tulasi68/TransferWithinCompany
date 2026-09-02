// Shared storage backed by one JSON file per organisation + city.
// The browser talks only to the Vercel /api/storage endpoint.
// No Supabase or database is required.

async function call(action, payload = {}) {
  const params = new URLSearchParams({ action });
  if (payload.key) params.set('key', payload.key);
  if (payload.prefix) params.set('prefix', payload.prefix);

  const isRead = action === 'get' || action === 'list';
  const response = await fetch(`/api/storage?${params.toString()}`, {
    method: isRead ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: isRead ? undefined : JSON.stringify(payload),
  });

  let data = null;
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) {
    throw new Error(data?.error || `Storage request failed (${response.status})`);
  }
  return data;
}

window.storage = {
  async get(key) {
    return call('get', { key });
  },
  async set(key, value) {
    return call('set', { key, value });
  },
  async delete(key) {
    return call('delete', { key });
  },
  async list(prefix = '') {
    return call('list', { prefix });
  },
};
