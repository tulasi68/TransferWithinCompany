const OWNER = process.env.GITHUB_OWNER || 'tulasi68';
const REPO = process.env.GITHUB_REPO || 'TransferWithinCompany';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

function headers() {
  const h = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

function slug(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

function requestEmail(key) {
  const value = String(key || '');
  return value.startsWith('request:') ? value.slice(8).trim().toLowerCase() : '';
}

function filePath(record) {
  const org = slug(record.organizationFinal || record.organization || 'Other');
  const city = slug(record.currentCity || 'Unknown');
  return `data/${org}_${city}.json`;
}

async function github(path, options = {}) {
  const response = await fetch(`${API}/contents/${path}?ref=${encodeURIComponent(BRANCH)}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}
  if (!response.ok) {
    const error = new Error(data?.message || `GitHub API error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function listDataFiles() {
  try {
    const response = await fetch(`${API}/contents/data?ref=${encodeURIComponent(BRANCH)}`, { headers: headers() });
    if (response.status === 404) return [];
    const text = await response.text();
    const data = JSON.parse(text);
    if (!response.ok) throw new Error(data?.message || `GitHub API error ${response.status}`);
    return Array.isArray(data) ? data.filter((x) => x.type === 'file' && x.name.endsWith('.json')) : [];
  } catch (error) {
    if (error?.status === 404) return [];
    throw error;
  }
}

async function readJsonFile(path, knownSha = null) {
  try {
    const meta = knownSha ? { sha: knownSha } : await github(path);
    if (knownSha) {
      const full = await github(path);
      return { records: JSON.parse(Buffer.from(full.content, 'base64').toString('utf8')), sha: full.sha };
    }
    return { records: JSON.parse(Buffer.from(meta.content, 'base64').toString('utf8')), sha: meta.sha };
  } catch (error) {
    if (error?.status === 404) return { records: [], sha: null };
    throw error;
  }
}

async function readAllRecords() {
  const files = await listDataFiles();
  const all = [];
  for (const file of files) {
    try {
      const result = await readJsonFile(file.path, file.sha);
      if (Array.isArray(result.records)) all.push(...result.records);
    } catch (_) {
      // Ignore an unreadable city file rather than breaking the whole directory.
    }
  }
  return all;
}

async function writeJsonFile(path, records, sha = null) {
  if (!process.env.GITHUB_TOKEN) {
    const error = new Error('GITHUB_TOKEN is not configured on Vercel.');
    error.status = 500;
    throw error;
  }

  const content = Buffer.from(`${JSON.stringify(records, null, 2)}\n`).toString('base64');
  const body = {
    message: `Update transfer requests: ${path}`,
    content,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const response = await fetch(`${API}/contents/${path}`, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}
  if (!response.ok) {
    const error = new Error(data?.message || `GitHub write failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export default async function handler(req, res) {
  const action = req.query.action || '';

  try {
    if (req.method === 'GET' && action === 'get') {
      const email = requestEmail(req.query.key);
      if (!email) return res.status(400).json({ error: 'Invalid request key.' });
      const records = await readAllRecords();
      const record = records.find((r) => String(r.email || '').trim().toLowerCase() === email);
      return res.status(200).json(record ? { key: `request:${email}`, value: JSON.stringify(record), shared: true } : null);
    }

    if (req.method === 'GET' && action === 'list') {
      const prefix = String(req.query.prefix || '');
      const records = await readAllRecords();
      const keys = records
        .map((r) => `request:${String(r.email || '').trim().toLowerCase()}`)
        .filter((key) => key.startsWith(prefix));
      return res.status(200).json({ keys: [...new Set(keys)], shared: true });
    }

    if (req.method === 'POST' && action === 'set') {
      const key = String(req.body?.key || '');
      const value = String(req.body?.value || '');
      const record = JSON.parse(value);
      if (!requestEmail(key) || !record.email || !record.currentCity || !(record.organizationFinal || record.organization)) {
        return res.status(400).json({ error: 'A request must contain email, organisation and current city.' });
      }

      const path = filePath(record);
      const existing = await readJsonFile(path);
      const email = requestEmail(key);
      const records = Array.isArray(existing.records) ? existing.records : [];
      const index = records.findIndex((r) => String(r.email || '').trim().toLowerCase() === email);
      if (index >= 0) records[index] = record;
      else records.push(record);
      await writeJsonFile(path, records, existing.sha);
      return res.status(200).json({ key, value, shared: true });
    }

    if (req.method === 'POST' && action === 'delete') {
      const email = requestEmail(req.body?.key);
      if (!email) return res.status(400).json({ error: 'Invalid request key.' });
      const files = await listDataFiles();
      for (const file of files) {
        const existing = await readJsonFile(file.path, file.sha);
        const records = Array.isArray(existing.records) ? existing.records : [];
        const filtered = records.filter((r) => String(r.email || '').trim().toLowerCase() !== email);
        if (filtered.length !== records.length) {
          await writeJsonFile(file.path, filtered, existing.sha);
          break;
        }
      }
      return res.status(200).json({ key: `request:${email}`, deleted: true, shared: true });
    }

    return res.status(400).json({ error: 'Unsupported storage operation.' });
  } catch (error) {
    console.error('storage api:', error);
    return res.status(error?.status || 500).json({ error: error?.message || 'Storage operation failed.' });
  }
}
