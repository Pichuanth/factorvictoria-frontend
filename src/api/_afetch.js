// Función común para llamar a API-FOOTBALL (v3)
const BASE = "https://v3.football.api-sports.io";

module.exports = async function afetch(path, params = {}) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("Falta API_FOOTBALL_KEY");

  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  const r = await fetch(url.toString(), {
    headers: { "x-apisports-key": key },
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`API error ${r.status}: ${text}`);
  }
  const json = await r.json();
  return json?.response ?? [];
};
