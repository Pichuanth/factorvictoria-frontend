// frontend/api/fixtures.js
import { apiSportsBase, apiSportsHeaders, listDays, mapCountry } from "./_utils/apisports";

export const config = {
  runtime: "nodejs", // evita Edge para poder usar fetch estándar y Date locales
};

const ok = (data, extra = {}) => new Response(
  JSON.stringify({ ok: true, items: data, ...extra }),
  {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  }
);

const bad = (status, msg) =>
  new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

function toUnix(d) {
  return Math.floor(new Date(d).getTime() / 1000);
}

function isFutureFixture(fx, nowTs) {
  // APISports: fixture.status.short === NS/TBD/… o timestamp futuro
  const ts = fx?.fixture?.timestamp ?? (fx?.fixture?.date ? toUnix(fx.fixture.date) : null);
  const short = fx?.fixture?.status?.short || "";
  if (["NS", "TBD"].includes(short)) return true;
  if (typeof ts === "number" && ts > nowTs) return true;
  return false;
}

function flatten(fx) {
  return {
    fixtureId: fx?.fixture?.id ?? fx?.id ?? null,
    teams: {
      home: fx?.teams?.home?.name || fx?.home?.name || "Home",
      away: fx?.teams?.away?.name || fx?.away?.name || "Away",
    },
    league: {
      name: fx?.league?.name || fx?.competition?.name || "",
      country: fx?.league?.country || fx?.competition?.area?.name || "",
    },
    fixture: {
      id: fx?.fixture?.id ?? null,
      date: fx?.fixture?.date ?? null,
      timestamp: fx?.fixture?.timestamp ?? null,
      status: fx?.fixture?.status?.short || "",
    },
  };
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from") || url.searchParams.get("date");
    const to = url.searchParams.get("to") || from;
    const q = (url.searchParams.get("q") || "").trim();
    const league = url.searchParams.get("league"); // numérico como string
    const futureOnly = url.searchParams.get("futureOnly") === "1";
    const countryParam = url.searchParams.get("country"); // ya en inglés
    const base = apiSportsBase();
    const headers = apiSportsHeaders();

    if (!from) return bad(400, "Debe enviar ?date=YYYY-MM-DD o ?from=YYYY-MM-DD");

    // armar lista de días
    const days = listDays(from, to);
    const nowTs = Math.floor(Date.now() / 1000);

    const queries = [];
    for (const d of days) {
      // 1) consulta amplia por día (captura Champions/Qualifiers/amistos)
      const u1 = new URL(`${base}/fixtures`);
      u1.searchParams.set("date", d);
      // solamente partidos no iniciados (reduce ruido de pasados en zona horaria)
      u1.searchParams.set("status", "NS"); // APISports permite múltiple pero NS es clave
      queries.push(u1.toString());

      // 2) si hay league id numérica
      if (league && /^\d+$/.test(league)) {
        const u2 = new URL(`${base}/fixtures`);
        u2.searchParams.set("date", d);
        u2.searchParams.set("league", league);
        u2.searchParams.set("status", "NS");
        queries.push(u2.toString());
      }

      // 3) si q parece país → filtrar también por country
      const mapped = countryParam || mapCountry(q);
      if (mapped) {
        const u3 = new URL(`${base}/fixtures`);
        u3.searchParams.set("date", d);
        u3.searchParams.set("country", mapped);
        u3.searchParams.set("status", "NS");
        queries.push(u3.toString());
      }
    }

    // descargar en paralelo y tolerar errores
    const results = await Promise.all(
      queries.map(async (u) => {
        try {
          const r = await fetch(u, { headers, cache: "no-store" });
          if (!r.ok) return [];
          const j = await r.json();
          return Array.isArray(j?.response) ? j.response : [];
        } catch {
          return [];
        }
      })
    );

    // unir, dedupe por fixtureId
    const raw = results.flat();
    const seen = new Set();
    let items = [];
    for (const fx of raw) {
      const id = fx?.fixture?.id ?? fx?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (futureOnly && !isFutureFixture(fx, nowTs)) continue;
      items.push(fx);
    }

    // si q es texto no-numérico: además filtrar por equipo/liga que contenga q
    if (q && !/^\d+$/.test(q)) {
      const needle = q.toLowerCase();
      items = items.filter((fx) => {
        const h = (fx?.teams?.home?.name || "").toLowerCase();
        const a = (fx?.teams?.away?.name || "").toLowerCase();
        const l = (fx?.league?.name || "").toLowerCase();
        return h.includes(needle) || a.includes(needle) || l.includes(needle);
      });
    }

    // ordenar: competiciones populares primero, luego por hora
    const pop = (fx) => {
      const l = (fx?.league?.name || "").toLowerCase();
      if (/world cup|eliminator|qualifier|amistos|friendly/.test(l)) return 100;
      if (/champions league|euro|libertadores|sudamericana/.test(l)) return 95;
      if (/premier league|la liga|serie a|bundesliga|ligue 1/.test(l)) return 90;
      return 40;
    };
    items.sort((A, B) => {
      const d = pop(B) - pop(A);
      if (d) return d;
      const ta = A?.fixture?.timestamp ?? 9e15;
      const tb = B?.fixture?.timestamp ?? 9e15;
      return ta - tb;
    });

    // dejar forma plana para el frontend
    const flat = items.map(flatten);

    return ok(flat, { count: flat.length });
  } catch (e) {
    return bad(500, `fixtures:error ${e.message || e}`);
  }
}
