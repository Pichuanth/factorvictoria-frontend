// api/odds.js
// Devuelve mercados normalizados (1X2 por defecto). Nunca 500.

export const config = { runtime: 'edge' };
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
    const fixture = url.searchParams.get("fixture");
    const want = (url.searchParams.get("market") || "1x2").toLowerCase();

    if (!fixture) return okJson({ markets: [], error: "missing fixture" });
    if (!API_KEY) return okJson({ markets: [], error: "APISPORTS_KEY missing" });

    const q = new URLSearchParams();
    q.set("fixture", fixture);

    const resp = await fetch(`https://${API_HOST}/odds?${q.toString()}`, {
      headers: {
        "x-apisports-key": API_KEY,
        "x-rapidapi-key": API_KEY
      },
      cache: "no-store"
    });

    const raw = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = raw?.errors ? JSON.stringify(raw.errors) : `${resp.status} ${resp.statusText}`;
      return okJson({ markets: [], error: `remote ${msg}` });
    }

    // API-FOOTBALL estructura: response[0].bookmakers[].bets[] con odds
    const respArr = Array.isArray(raw?.response) ? raw.response : [];
    const first   = respArr[0] || {};
    const books   = Array.isArray(first?.bookmakers) ? first.bookmakers : [];

    const out = [];
    for (const b of books) {
      for (const bet of (b?.bets || [])) {
        const key = (bet?.name || bet?.label || "").toLowerCase();
        // buscamos 1x2, pero dejamos pasar más mercados si se piden
        if (want === "1x2" && !key.includes("1x2") && !key.includes("match winner")) continue;

        const outcomes = (bet?.values || bet?.outcomes || []).map(o => {
          const name = (o?.value || o?.label || o?.name || "").toString();
          const odd  = Number(o?.odd ?? o?.value ?? o?.price);
          return { name, odd };
        }).filter(o => o.odd > 1.01);

        if (outcomes.length) out.push({ key, outcomes });
      }
    }

    return okJson({ markets: out });
  } catch (e) {
    return okJson({ markets: [], error: String(e?.message || e) });
  }
}
