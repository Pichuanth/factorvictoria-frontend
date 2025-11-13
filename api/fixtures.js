// api/fixtures.js
import { afetch, jsonOrError } from "./_apifootball";

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
const safeLower = (x) => String(x || "").toLowerCase();
const normCountry = (q) => {
  const key = String(q || "").toLowerCase().replace(/\s+/g, "");
  return COUNTRY_ALIAS[key] || null;
};

function mapFixture(apiItem) {
  // normaliza a shape usado por el frontend
  const f = apiItem?.fixture || {};
  const t = apiItem?.teams || {};
  const l = apiItem?.league || {};
  const ts = f.timestamp ?? (f.date ? Date.parse(f.date) / 1000 : null);
  return {
    fixtureId: f.id ?? apiItem?.id ?? `${l.id || ""}-${ts || ""}`,
    teams: { home: t.home?.name || "", away: t.away?.name || "" },
    league: { id: l.id, name: l.name || "" },
    timestamp: ts || null,
    raw: apiItem,
  };
}

export default async function handler(req, res) {
  try {
    const {
      date,
      from,
      to,
      league,
      country,
      q,           // texto libre: equipo / liga / país
      futureOnly,  // "1" para sólo futuros
    } = req.query;

    const today = toYYYYMMDD(new Date());
    const days = date ? [date] : listDays(from || today, to || from || today);

    // Si hay league numérica, la pasamos tal cual
    const leagueId = /^\d+$/.test(String(league || "")) ? String(league) : null;

    // País: o viene en country, o intentamos sacarlo de q (alias ES->EN)
    let countryFilter = country || null;
    if (!countryFilter && q) {
      const maybeCountry = normCountry(q);
      if (maybeCountry) countryFilter = maybeCountry;
    }

    // Vamos pidiendo por día; si hay league se usa &league, si no se hace por date (+country si viene)
    const requests = [];
    for (const d of days) {
      const params = new URLSearchParams({ date: d });
      if (leagueId) params.set("league", leagueId);
      if (!leagueId && countryFilter) params.set("country", countryFilter);
      // status=NS/TBD para forzar futuros; aún así filtramos abajo por timestamp
      const url = `/fixtures?${params.toString()}`;
      requests.push(afetch(url).then(jsonOrError).catch(() => ({ response: { fixtures: [] } })));
    }

    const batches = await Promise.all(requests);
    let items = [];
    for (const b of batches) {
      const arr = Array.isArray(b?.response) ? b.response : b?.response?.fixtures || b?.response || [];
      items.push(...arr.map(mapFixture));
    }

    // dedupe por fixtureId
    const seen = new Set();
    items = items.filter((it) => {
      const id = String(it.fixtureId || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // Filtro futuro (client-side robusto)
    const now = Date.now();
    if (String(futureOnly) === "1") {
      items = items.filter((it) => {
        const tsMs = it.timestamp ? it.timestamp * 1000 : null;
        return tsMs ? tsMs >= now : true;
      });
    }

    // Filtro de texto libre q (equipo/liga/país)
    if (q && !leagueId) {
      const txt = safeLower(q);
      items = items.filter((it) => {
        const h = safeLower(it.teams.home);
        const a = safeLower(it.teams.away);
        const lg = safeLower(it.league?.name);
        // también dejamos pasar si coincide con el país normalizado
        const ctry = normCountry(txt);
        return (
          (txt.length >= 3 && (h.includes(txt) || a.includes(txt) || lg.includes(txt))) ||
          (!!ctry && (!!countryFilter ? countryFilter === ctry : true))
        );
      });
    }

    // Orden por “popularidad” aproximada y kickoff
    const popularity = (name) => {
      const s = safeLower(name);
      if (/world cup|copa mundial|qualifier|eliminatoria/.test(s)) return 100;
      if (/uefa euro|nations league|champions league/.test(s)) return 95;
      if (/libertadores|sudamericana/.test(s)) return 92;
      if (/premier league|la liga|serie a|bundesliga|ligue 1/.test(s)) return 90;
      if (/mls|brasileir|argentina|eredivisie|primeira liga/.test(s)) return 80;
      return 40;
    };
    items.sort((A, B) => {
      const p = popularity(B.league?.name) - popularity(A.league?.name);
      if (p !== 0) return p;
      const ta = A.timestamp ? A.timestamp * 1000 : 9e15;
      const tb = B.timestamp ? B.timestamp * 1000 : 9e15;
      return ta - tb;
    });

    res.status(200).json({ count: items.length, items });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
