// frontend/api/_afetch.js
const BASE = 'https://v3.football.api-sports.io';

export async function callApiFootball(path, params = {}) {
  const key = process.env.APIFOOTBALL_KEY; // <— IMPORTANTE (sin VITE_)
  if (!key) {
    throw new Error('APIFOOTBALL_KEY is missing in serverless env');
  }

  const qs = new URLSearchParams(params);
  const url = `${BASE}${path}?${qs.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-apisports-key': key,
      'Accept': 'application/json'
    },
    // Vercel Node runtime ya trae fetch nativo (no uses node-fetch aquí)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  return json;
}
