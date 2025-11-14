// frontend/api/odds.js
export const config = { runtime: "nodejs" };

import { apiSportsBase, apiSportsHeaders } from "./_utils/apisports";

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const fixture = url.searchParams.get("fixture");
    if (!fixture) {
      return new Response(JSON.stringify({ ok: false, error: "falta ?fixture=" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const r = await fetch(`${apiSportsBase()}/odds?fixture=${fixture}&bookmaker=8`, {
      headers: apiSportsHeaders(),
      cache: "no-store",
    });
    const j = await r.json();
    // normaliza a markets/outcomes esperado por el front
    const markets = [];
    const list = Array.isArray(j?.response) ? j.response : [];
    for (const row of list) {
      const firstBk = row?.bookmakers?.[0];
      const firstMk = firstBk?.bets?.[0];
      if (!firstMk?.values) continue;
      markets.push({
        name: firstMk.name || "1X2",
        outcomes: firstMk.values.map((v) => ({
          name: v?.value,
          odd: Number(v?.odd),
        })),
      });
    }
    return new Response(JSON.stringify({ ok: true, markets }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e.message || e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
