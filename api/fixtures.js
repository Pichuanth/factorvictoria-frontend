// api/fixtures.js
// Serverless: devuelve fixtures desde API-FOOTBALL, con soporte de rango e "upcoming only"

export const config = { runtime: "edge" };

const APISPORTS_KEY  = process.env.APISPORTS_KEY;
const APISPORTS_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const DEFAULT_TZ     = process.env.VITE_API_TZ || "America/Santiago";

// Pequeño fetch con cabeceras de API-FOOTBALL
async function apiFootball(path, params = {}) {
  if (!APISPORTS_KEY) {
    return new Response(JSON.stringify({ error: "Missing APISPORTS_KEY" }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }

  const qs = new URLSearchParams(params);
  const url = `https://${APISPORTS_HOST}${path}?${qs.toString()}`;

  const res = await fetch(url, {
    headers: {
      "x-apisports-key": APISPORTS_KEY,
      "x-rapidapi-key": APISPORTS_KEY,        // (algunas cuentas usan este header)
      "accept": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return new Response(JSON.stringify({ error: `Upstream ${res.status}`, body: txt }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }

  return res.json();
}

// util: yyyy-mm-dd
function fmt(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function* daysBetween(fromStr, toStr) {
  const from = new Date(fromStr + "T00:00:00");
  const to   = new Date(toStr   + "T00:00:00");
  for (let d = new Date(from); d <= to; d.setDate(d.getDate()+1)) {
    yield fmt(d);
  }
}

// mapea respuesta a tu shape
function mapFixture(x) {
  const f = x.fixture || {};
  const l = x.league  || {};
  const t = x.teams   || {};
  return {
    fixtureId: f.id,
    date: f.date,
    timestamp: f.timestamp ? f.timestamp * 1000 : null,
    status: f.status?.short,
    league: { id: l.id, name: l.name, round: l.round, season: l.season },
    country: { code: l.country, name: l.country },
    teams: { home: t.home?.name, away: t.away?.name },
  };
}

// decide si es jugable (solo próximos)
function isUpcoming(fixt, nowMs) {
  const allowed = new Set(["NS", "TBD", "PST"]); // Not Started, To Be Decided, Postponed
  const okStatus = allowed.has(String(fixt.status || "").toUpperCase());
  const tsOk = !fixt.timestamp || fixt.timestamp >= (nowMs - 30 * 60 * 1000); // evita ya finalizados por desfase
  return okStatus && tsOk;
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const date    = searchParams.get("date");     // yyyy-mm-dd (1 día)
    const from    = searchParams.get("from");     // yyyy-mm-dd
    const to      = searchParams.get("to");       // yyyy-mm-dd
    const country = searchParams.get("country");  // "Chile"
    const league  = searchParams.get("league");   // id numérico como string
    const tz      = DEFAULT_TZ;

    // construir lista de días a consultar
    let days = [];
    if (date) {
      days = [date];
    } else if (from && to) {
      days = Array.from(daysBetween(from, to));
    } else {
      // por defecto hoy
      days = [fmt(new Date())];
    }

    const nowMs = Date.now();
    const allItems = [];

    // API-FOOTBALL funciona mejor por fecha individual; iteramos por día
    for (const d of days) {
      const params = { date: d, timezone: tz };
      if (country) params.country = country;
      if (league)  params.league  = league;

      const json = await apiFootball("/fixtures", params);
      // Si apiFootball devolvió Response (error), reenviar tal cual
      if (json instanceof Response) return json;

      const list = Array.isArray(json?.response) ? json.response : [];
      for (const raw of list) {
        const m = mapFixture(raw);
        if (isUpcoming(m, nowMs)) allItems.push(m);
      }
    }

    // ordenar por fecha próxima
    allItems.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    return new Response(JSON.stringify({
      count: allItems.length,
      items: allItems,
      meta: { days, tz, filteredToUpcoming: true }
    }), { headers: { "content-type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
}
