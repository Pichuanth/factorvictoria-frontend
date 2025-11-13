// frontend/api/fixtures.js
import fetch from "node-fetch";

const API_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const API_KEY  = process.env.APISPORTS_KEY;

// Alias ES→EN para country
const COUNTRY_ALIAS = {
  francia: "France",
  inglaterra: "England",
  españa: "Spain",
  espana: "Spain",
  portugal: "Portugal",
  italia: "Italy",
  alemania: "Germany",
  noruega: "Norway",
  chile: "Chile",
  argentina: "Argentina",
  brasil: "Brazil",
  mexico: "Mexico",
  estadosunidos: "USA",
  eeuu: "USA",
};

const popularChecks = [
  { re: /world cup|copa mundial|qualifier|eliminatoria/i, score: 100 },
  { re: /uefa euro|nations league|champions league/i, score: 95 },
  { re: /libertadores|sudamericana/i, score: 92 },
  { re: /premier league|la liga|serie a|bundesliga|ligue 1/i, score: 90 },
  { re: /mls|brasileir|argentina|eredivisie|primeira liga/i, score: 80 },
];

function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function listDays(fromStr, toStr) {
  const out = [];
  let d = new Date(fromStr);
  const end = new Date(toStr);
  while (d <= end) {
    out.push(toYYYYMMDD(d));
    d = addDays(d, 1);
  }
  return out;
}
function popScore(name = "") {
  for (const { re, score } of popularChecks) if (re.test(name)) return score;
  return 40;
}

function mapItem(apiIt) {
  const fix = apiIt?.fixture || apiIt;
  const lea = apiIt?.league || {};
  const teams = apiIt?.teams || {};
  const ts =
    fix?.timestamp ??
    (fix?.date ? Math.floor(Date.parse(fix.date) / 1000) : null);

  return {
    fixtureId: String(fix?.id ?? apiIt?.id ?? ""),
    timestamp: ts,
    league: { name: lea?.name || "" },
    teams: {
      home: teams?.home?.name || "",
      away: teams?.away?.name || "",
      homeId: teams?.home?.id ?? null,
      awayId: teams?.away?.id ?? null,
    },
    _raw: apiIt,
  };
}

async function getFixturesByDate(date, params) {
  const url = new URL(`https://${API_HOST}/fixtures`);
  url.searchParams.set("date", date);
  if (params.league)  url.searchParams.set("league", params.league);
  if (params.country) url.searchParams.set("country", params.country);
  // Nota: no filtramos status aquí; filtramos luego con futureOnly.

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": API_KEY || "",
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`APISports ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const list = Array.isArray(json?.response) ? json.response : [];
  return list.map(mapItem);
}

export default async function handler(req, res) {
  try {
    const { date, from, to, league, country, q, futureOnly } = req.query;

    // Fallback demo si no hay KEY
    if (!API_KEY) {
      const f = date || from || to || toYYYYMMDD(new Date());
      const items = Array.from({ length: 10 }).map((_, i) => ({
        fixtureId: `demo-${f}-${i + 1}`,
        timestamp: Math.floor(Date.now() / 1000) + 3600 * (i + 1),
        league: { name: "DEMO" },
        teams: {
          home: `Equipo A${i + 1}`,
          away: `Equipo B${i + 1}`,
          homeId: null,
          awayId: null,
        },
      }));
      return res.status(200).json({ count: items.length, items });
    }

    // Parametría
    const isRange = !!(from && to);
    const leagueId = league && /^\d+$/.test(String(league)) ? String(league) : null;

    let countryNorm = null;
    if (country) {
      const key = String(country).toLowerCase().replace(/\s+/g, "");
      countryNorm = COUNTRY_ALIAS[key] || country; // intenta alias ES→EN
    }

    const days = isRange ? listDays(from, to) : [date || toYYYYMMDD(new Date())];

    // Fetch por día: siempre hacemos una consulta "amplia";
    // si hay country válido, hacemos además otra por country.
    const promises = [];
    for (const d of days) {
      promises.push(getFixturesByDate(d, { league: leagueId, country: null }));
      if (countryNorm && !leagueId) {
        promises.push(getFixturesByDate(d, { league: null, country: countryNorm }));
      }
    }

    const batches = await Promise.allSettled(promises);
    let items = [];
    for (const b of batches) if (b.status === "fulfilled") items.push(...b.value);

    // De-duplicar por fixtureId
    const seen = new Set();
    items = items.filter((it) => {
      if (!it.fixtureId) return false;
      if (seen.has(it.fixtureId)) return false;
      seen.add(it.fixtureId);
      return true;
    });

    // futureOnly (client-safe desde backend)
    if (String(futureOnly) === "1") {
      const now = Date.now();
      items = items.filter((it) => {
        const ms = it.timestamp ? it.timestamp * 1000 : null;
        if (ms == null) return true; // si no sabemos, no lo descartes
        return ms >= now;
      });
    }

    // Filtro por q (texto) si viene
    if (q && String(q).trim().length >= 3) {
      const qtxt = String(q).trim().toLowerCase();
      items = items.filter((it) => {
        const h = (it.teams?.home || "").toLowerCase();
        const a = (it.teams?.away || "").toLowerCase();
        const ln = (it.league?.name || "").toLowerCase();
        return h.includes(qtxt) || a.includes(qtxt) || ln.includes(qtxt);
      });
    }

    // Orden: popularidad + kickoff
    items.sort((A, B) => {
      const ps = popScore(B.league?.name) - popScore(A.league?.name);
      if (ps !== 0) return ps;
      const ta = A.timestamp ? A.timestamp : Number.MAX_SAFE_INTEGER;
      const tb = B.timestamp ? B.timestamp : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

    return res.status(200).json({ count: items.length, items });
  } catch (err) {
    console.error("[/api/fixtures] Error:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
