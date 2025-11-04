// Usa la clave de API-Football desde variables de entorno en Vercel
const BASE = 'https://v3.football.api-sports.io';

export default async function afetch(path, params = {}) {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) throw new Error('Missing APIFOOTBALL_KEY');

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const r = await fetch(url, {
    headers: {
      'x-apisports-key': key,
      // El host ya no es obligatorio; API-Football lo deduce del dominio v3
      // 'x-rapidapi-host': 'v3.football.api-sports.io'
    },
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`API ${r.status}: ${txt.slice(0, 180)}`);
  }
  return r.json();
}
