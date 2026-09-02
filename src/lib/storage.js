// Shared storage backed by one JSON file per organisation + city.
// The browser talks only to the Vercel /api/storage endpoint.
// No Supabase or database is required.

async function call(action, payload = {}) {
  const response = await fetch(`/api/storage?action=${encodeURIComponent(action)}`, {
    method: action === 'get' || action === 'list' ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: action === 'get' || action === 'list' ? undefined : JSON.stringify(payload),
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
