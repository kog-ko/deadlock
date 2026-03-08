export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send('Missing player id');

  const STEAM_BASE = 76561197960265728n;
  const isNumeric = /^\d+$/.test(id);

  let steamid64 = id;
  let accountId = id;

  if (isNumeric) {
    if (id.length === 17 && id.startsWith('7656')) {
      steamid64 = id;
      accountId = String(BigInt(id) - STEAM_BASE);
    } else {
      accountId = id;
      steamid64 = String(BigInt(id) + STEAM_BASE);
    }
  }

  // Fetch Steam profile for OG tags
  let name = `Account #${accountId}`;
  let avatar = '';
  let description = 'View Deadlock stats, match history, and hero performance.';

  try {
    const profileUrl = `https://steamcommunity.com/profiles/${steamid64}/?xml=1`;
    const upstream = await fetch(profileUrl, {
      headers: { 'User-Agent': 'deadlock-tracker/1.0' }
    });
    const xml = await upstream.text();

    const nameMatch = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]>/);
    if (nameMatch) name = nameMatch[1];

    const avatarMatch = xml.match(/<avatarFull><!\[CDATA\[(.*?)\]\]>/);
    if (avatarMatch) avatar = avatarMatch[1];
  } catch (e) {
    // Fallback to defaults
  }

  // Try to get basic stats
  try {
    const statsUrl = `https://api.deadlock-api.com/v1/players/${accountId}/match-history?game_mode=1`;
    const statsRes = await fetch(statsUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'deadlock-tracker/1.0' }
    });
    if (statsRes.ok) {
      const data = await statsRes.json();
      const matches = Array.isArray(data) ? data : [];
      let wins = 0, total = 0, kills = 0, deaths = 0, assists = 0;
      for (const m of matches) {
        total++;
        if (m.match_result === 1) wins++;
        kills += m.player_kills || 0;
        deaths += m.player_deaths || 0;
        assists += m.player_assists || 0;
      }
      if (total > 0) {
        const wr = ((wins / total) * 100).toFixed(1);
        const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(2) : (kills + assists).toFixed(2);
        description = `${total} matches | ${wins}W-${total - wins}L (${wr}%) | ${kda} KDA`;
      }
    }
  } catch (e) {
    // Fallback to default description
  }

  const title = `${name} - bastards deadlock`;
  const siteUrl = `https://bastards-deadlock.vercel.app`;
  const playerUrl = `${siteUrl}/?p=${steamid64}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${playerUrl}" />
  ${avatar ? `<meta property="og:image" content="${escapeHtml(avatar)}" />` : ''}
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${avatar ? `<meta name="twitter:image" content="${escapeHtml(avatar)}" />` : ''}
  <meta name="theme-color" content="#222222" />
  <meta http-equiv="refresh" content="0;url=${playerUrl}" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <p>Redirecting to <a href="${playerUrl}">${escapeHtml(name)}'s Deadlock stats</a>...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
