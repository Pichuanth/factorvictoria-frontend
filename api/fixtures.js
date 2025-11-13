// /api/fixtures.js
export const config = { runtime: "edge" };

const API_KEY  = process.env.APISPORTS_KEY;          // <-- en Vercel
const API_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const TZ       = process.env.VITE_API_TZ || "America/Santiago";

// Status futuros que nos interesan
const FUTURE_STATUSES = new Set(["NS", "TBD", "PST"]);

// “Pesos” para ordenar arriba partidos importantes
const IMPORTANT_HINTS = [
  "world cup", "fifa", "qualifier", "elimin", "uefa", "champions",
  "europa", "conference", "copa libert", "sudamericana", "premier",
  "la liga", "serie a", "bundes", "ligue 1", "eredivisie", "mls",
  "copa américa", "conmebol"
];

function isFuture(fx) {
  const ts = fx?.fixture?.timestamp ? Number(fx.fixture.timestamp) * 1000 : 0;
  if (!ts) return false;
  // margen de 5 min por si la API trae algo en transición
  return ts >= Date.now() - 5 * 60 * 1000;
}

function importanceScore(fx) {
  const name = `${fx?.league?.name || ""} ${fx?.league?.round || ""}`.toLowerCase();
  let score = 0;
  for (const hint of IMPORTANT_HINTS) if (name.includes(hint)) score += 5;
  // Ligas de primera división suelen traer level 1; si no hay, usa país conocido
  const country = (fx?.league?.country || "").toLowerCase();
  if (["england","spain","italy","germany","france","netherlands","argentina","brazil","portugal","mexico","usa","chile","uruguay","colombia"].includes(country)) {
    score += 2;
  }
  return score;
}

async function api(path, params) {
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: "Missing APISPORTS_KEY" }), { status: 500 });
  }
  const url = new URL(`https://${API_HOST}${path}`);
  for (const [k, v] of Object.entries(params || {})) if (v != null && v !== "") url.searchParams.set(k, v);
  // Forzamos timezone
  if (!url.searchParams.has("timezone")) url.searchParams.set("timezone", TZ);

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": API_KEY, "x-rapidapi-key": API_KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return new Response(JSON.stringify({ error: `Upstream ${res.status} ${res.statusText}`, detail: txt }), { status: 500 });
  }
  const data = await res.json();
  return data;
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const date   = searchParams.get("date");      // YYYY-MM-DD
    const from   = searchParams.get("from");      // YYYY-MM-DD
    const to     = searchParams.get("to");        // YYYY-MM-DD
    const q      = searchParams.get("q") || searchParams.get("country") || ""; // compat con front antiguo
    const league = searchParams.get("league");    // league id (num)
    const tz     = searchParams.get("tz") || TZ;

    let params = {};
    if (date) {
      params = { date, timezone: tz };
    } else {
      // API-FOOTBALL soporta rango hasta 7 días
      if (!from || !to) {
        return new Response(JSON.stringify({ items: [], count: 0 }), { status: 200 });
      }
      params = { from, to, timezone: tz };
    }

    // Si viene league numérico, úsalo directo (mucho más preciso)
    if (league && /^\d+$/.test(league)) params.league = league;

    // 1) Trae fixtures por día o rango
    const raw = await api("/fixtures", params);
    if (raw instanceof Response) return raw; // error ya formateado

    let list = Array.isArray(raw?.response) ? raw.response : [];

    // 2) Filtro sólo futuros
    list = list.filter(fx => FUTURE_STATUSES.has(fx?.fixture?.status?.short || "") || isFuture(fx));

    // 3) Filtro por q (si no vino league)
    const qTrim = (q || "").trim();
    if (qTrim && !params.league) {
      if (/^\d+$/.test(qTrim)) {
        // tratar como leagueId
        list = list.filter(fx => String(fx?.league?.id || "") === qTrim);
      } else {
        const ql = qTrim.toLowerCase();
        list = list.filter(fx => {
          const ctry  = String(fx?.league?.country || "").toLowerCase();
          const lname = String(fx?.league?.name || "").toLowerCase();
          const h     = String(fx?.teams?.home?.name || "").toLowerCase();
          const a     = String(fx?.teams?.away?.name || "").toLowerCase();
          return ctry.includes(ql) || lname.includes(ql) || h.includes(ql) || a.includes(ql);
        });
      }
    }

    // 4) Ordenar por importancia + fecha
    list.sort((a, b) => {
      const ib = importanceScore(b) - importanceScore(a);
      if (ib !== 0) return ib;
      const ta = Number(a?.fixture?.timestamp || 0);
      const tb = Number(b?.fixture?.timestamp || 0);
      return ta - tb;
    });

    // 5) Normalizar salida
    const items = list.map(fx => ({
      fixtureId: fx?.fixture?.id,
      date: fx?.fixture?.date,
      timestamp: fx?.fixture?.timestamp,
      league: { id: fx?.league?.id, name: fx?.league?.name, round: fx?.league?.round },
      country: fx?.league?.country,
      teams: { home: fx?.teams?.home?.name, away: fx?.teams?.away?.name },
      status: fx?.fixture?.status?.short,
    }));

    return new Response(JSON.stringify({ count: items.length, items }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}
