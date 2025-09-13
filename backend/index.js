import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());
const PORT = process.env.PORT || 4000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// Simple in-memory cache
let cache = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 60 * 10 * 1000; // 10 minutes

// Airtable config (replace with your own)
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Table1';

async function fetchAirtableRecords() {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`
    }
  });
  const json = await res.json();
  return json.records.map(r => ({
    name: r.fields.name,
    lat: r.fields.lat ? Number(r.fields.lat) : null,
    lng: r.fields.lng ? Number(r.fields.lng) : null,
    type: r.fields.type,
    attendees: r.fields.attendees ? Number(r.fields.attendees) : 1,
    // Optional projected attendees for Daydream (or other types if provided)
    projectedAttendees: r.fields.projectedAttendees ? Number(r.fields.projectedAttendees) : null
  }));
}

app.get('/api/records', async (req, res) => {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return res.json(cache.data);
  }
  try {
  const records = (await fetchAirtableRecords()).filter(r => typeof r.lat === 'number' && typeof r.lng === 'number');
    cache = { data: records, timestamp: now };
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});
// Authenticated refresh endpoint to clear and warm cache
app.post('/api/refresh', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Clear cache and refetch
    cache = { data: null, timestamp: 0 };
    const records = (await fetchAirtableRecords()).filter(r => typeof r.lat === 'number' && typeof r.lng === 'number');
    cache = { data: records, timestamp: Date.now() };
    return res.json({ ok: true, count: records.length, lastUpdated: cache.timestamp });
  } catch (e) {
    return res.status(500).json({ error: 'Refresh failed' });
  }
});
// Status endpoint for cache metadata
app.get('/api/status', (req, res) => {
  res.json({
    lastUpdated: cache.timestamp || 0,
    lastUpdatedIso: cache.timestamp ? new Date(cache.timestamp).toISOString() : null,
    count: Array.isArray(cache.data) ? cache.data.length : 0,
    cacheTtlMs: CACHE_TTL
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
