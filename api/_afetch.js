export async function aFetch(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `https://v3.football.api-sports.io${path}${qs ? `?${qs}` : ""}`;

  const r = await fetch(url, {
    headers: {
      "x-apisports-key": process.env.APIFOOTBALL_KEY,
      "x-rapidapi-host": "v3.football.api-sports.io"
    },
    // evita edge caching agresivo
    cache: "no-store"
  });

  if (!r.ok) {
    const txt = await r.text().catch(()=>"");
    throw new Error(`API-FOOTBALL ${r.status}: ${txt}`);
  }
  return r.json();
}
