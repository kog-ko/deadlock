export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint, ...queryParams } = req.query;
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint param' });

  const qs = new URLSearchParams(queryParams).toString();
  const upstream = `https://api.deadlock-api.com/v1/${endpoint}${qs ? '?' + qs : ''}`;

  try {
    const upstream_res = await fetch(upstream, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'deadlock-tracker/1.0' }
    });
    const data = await upstream_res.json();
    res.status(upstream_res.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
