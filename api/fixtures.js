// api/fixtures.js
// Devuelve fixtures normalizados desde API-FOOTBALL.
// Nunca lanza 500: ante error responde { items: [], error: "..."} con 200.

export const config = { runtime: 'edge' }; // frío + rápido
const API_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const API_KEY  = process.env.APISPORTS_KEY  || "";

function okJson(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || "";
    const from = url.searchParams.get("from") || "";
    const to   = url.searchParams.get("to")   || "";
    const country = url.searchParams.get("country") || "";
    const league  = url.searchParams.get("league")  || "";
    const tz = "America/Santiago";

    if (!API_KEY) {
      return okJson({ items: [], error: "APISPORTS_KEY missing" });
    }

    // Construir query API-FOOTBALL
    const q = new URLSearchParams();
    q.set("timezone", tz);
    if (date) q.set("date", date);
    if (from) q.set("from", from);
    if (to)   q.set("to", to);
    if (country) q.set("country", country);
    if (league)  q.set("league", league);

    const resp = await fetch(`https://${API_HOST}/fixtures?${q.toString()}`, {
      headers: {
        "x-apisports-key": API_KEY,
        "x-rapidapi-key": API_KEY // por si tu plan usa wrapper RapidAPI
      },
      // no cache para pruebas
      cache: "no-store"
    });

    const raw = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = raw?.errors ? JSON.stringify(raw.errors) : `${resp.status} ${resp.statusText}`;
      return okJson({ items: [], error: `remote ${msg}` });
    }

    const list = Array.isArray(raw?.response) ? raw.response : [];
    const items = list.map(it => ({
      fixtureId: it?.fixture?.id,
      date: it?.fixture?.date,
      country: it?.league?.country || it?.league?.name,
      league: it?.league?.name,
      teams: {
        home: it?.teams?.home?.name,
        away: it?.teams?.away?.name
      }
    })).filter(x => x.fixtureId);

    return okJson({ count: items.length, items });
  } catch (e) {
    return okJson({ items: [], error: String(e?.message || e) });
  }
}
