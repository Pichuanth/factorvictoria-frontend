// Minimal client for API-FOOTBALL (ESM, Node 18+)
const BASE = "https://v3.football.api-sports.io";

export default async function afetch(path, params = {}) {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) throw new Error("APIFOOTBALL_KEY not set");

  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });

  const url = `${BASE}${path}?${qs.toString()}`;
  const res = await fetch(url, {
    headers: { "x-apisports-key": key, accept: "application/json" },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`);
  }
  const json = await res.json();
  if (json?.errors && Object.keys(json.errors).length) {
    throw new Error(`API errors: ${JSON.stringify(json.errors)}`);
  }
  return json;
}
