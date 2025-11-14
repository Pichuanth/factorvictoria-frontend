// api/fixtures.js
import { apisGet } from "./_utils/apisports";

function toYYYYMMDD(d) {
  const pad = (n) => String(n).toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
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

export default async function handler(req, res) {
  try {
    const {
      date,
      from,
      to,
      league,                 // id numérica de liga
      country,                // texto (ej: "France")
      q,                      // libre: equipo/país/competición
      futureOnly = "0",
      timezone = "America/Santiago", // importante para que coincidan fechas locales
    } = req.query;

    // Fechas a consultar (1 o varias)
    const days = date ? [date] : listDays(from || toYYYYMMDD(new Date()), to || from || toYYYYMMDD(new Date()));

    // Descargamos fixtures por día (en paralelo)
    const batches = await Promise.all(days.map(async (d) => {
      // Query base por día
      const params = { date: d, timezone };

      // Filtros “duros”
      if (league) params.league = league;
      if (country) params.country = country;

      // Llamada principal: /fixtures
      const fx = await apisGet("/fixtures", params);

      // Estructuramos
      const arr = Array.isArray(fx?.response) ? fx.response : [];
      return arr.map((r) => ({
        fixtureId: r?.fixture?.id,
        teams: { home: r?.teams?.home?.name, away: r?.teams?.away?.name },
        league: { name: r?.league?.name, country: r?.league?.country },
        timestamp: r?.fixture?.timestamp,        // epoch (s)
        fixture: r?.fixture,                     // por si luego quieres más campos
      }));
    }));

    // Merge + dedupe
    const seen = new Set();
    let items = [];
    for (const arr of batches) {
      for (const it of arr) {
        const id = String(it.fixtureId);
        if (seen.has(id)) continue;
        seen.add(id);
        items.push(it);
      }
    }

    // FUTURE ONLY: filtra por hora actual si viene activado
    if (futureOnly === "1") {
      const now = Date.now() / 1000;
      items = items.filter((it) => !it.timestamp || it.timestamp >= now);
    }

    // Filtro “blando” por q (equipo/competición/país)
    if (q && String(q).trim().length >= 2) {
      const txt = String(q).toLowerCase();
      items = items.filter((it) => {
        const h = String(it.teams?.home || "").toLowerCase();
        const a = String(it.teams?.away || "").toLowerCase();
        const ln = String(it.league?.name || "").toLowerCase();
        const lc = String(it.league?.country || "").toLowerCase();
        return h.includes(txt) || a.includes(txt) || ln.includes(txt) || lc.includes(txt);
      });
    }

    // Orden sugerido: primero por popularidad (ligas “grandes”), luego por fecha
    const pop = (it) => {
      const name = String(it.league?.name || "").toLowerCase();
      if (/world cup|qualifier|euro|champions|libertadores|sudamericana/.test(name)) return 100;
      if (/premier|la liga|serie a|bundesliga|ligue 1/.test(name)) return 90;
      return 40;
    };
    items.sort((A, B) => {
      const p = pop(B) - pop(A);
      if (p) return p;
      return (A.timestamp || 9e12) - (B.timestamp || 9e12);
    });

    res.status(200).json({ count: items.length, items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
