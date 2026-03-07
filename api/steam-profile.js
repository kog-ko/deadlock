export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { steamid } = req.query;
  if (!steamid) return res.status(400).json({ error: 'Missing steamid param' });

  // steamid can be a 64-bit ID or a vanity URL slug
  const isNumeric = /^\d+$/.test(steamid);
  const url = isNumeric
    ? `https://steamcommunity.com/profiles/${steamid}/?xml=1`
    : `https://steamcommunity.com/id/${steamid}/?xml=1`;

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'deadlock-tracker/1.0' }
    });
    const xml = await upstream.text();

    const error = xml.match(/<error><!\[CDATA\[(.*?)\]\]><\/error>/);
    if (error) return res.status(404).json({ error: error[1] });

    const id64 = xml.match(/<steamID64>(\d+)<\/steamID64>/)?.[1] || null;
    const name = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]>/)?.[1] || null;
    const avatar = xml.match(/<avatarMedium><!\[CDATA\[(.*?)\]\]>/)?.[1] || null;
    const avatarFull = xml.match(/<avatarFull><!\[CDATA\[(.*?)\]\]>/)?.[1] || null;

    res.status(200).json({ steamid64: id64, name, avatar, avatarFull });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
