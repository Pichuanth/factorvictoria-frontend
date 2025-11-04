// /api/_afetch.js  (ESM, Node 18+)
const API_BASE = 'https://v3.football.api-sports.io';

export default async function afetch(path, params = {}) {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) throw new Error('Missing env APIFOOTBALL_KEY');

  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  // agrega tu TZ por defecto si sirve
  if (!url.searchParams.has('timezone')) {
    url.searchParams.set('timezone', 'America/Santiago');
  }

  const res = await fetch(url, {
    headers: {
      'x-apisports-key': key,
      // opcional pero correcto para v3
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'accept': 'application/json',
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`API-Football ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}
