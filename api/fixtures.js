// api/fixtures.js
import fetch from "node-fetch";

const API_KEY = process.env.APISPORTS_KEY;
const API_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const TIMEZONE = "America/Santiago";

export default async function handler(req, res) {
  try {
    if (!API_KEY) {
      return res
        .status(500)
        .json({ error: "Falta configurar APISPORTS_KEY en las variables de entorno." });
    }

    const { from, to, status, country, q } = req.query || {};

    const params = new URLSearchParams();

    // rango de fechas (from / to) tal como los envía el frontend: YYYY-MM-DD
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    // status opcional (por ejemplo "NS" para futuros). Si no viene, que traiga todo.
    if (status) params.set("status", status);

    // siempre usamos la misma zona horaria para que los horarios cuadren con Chile
    params.set("timezone", TIMEZONE);

    // filtros de país / búsqueda
    if (country) {
      params.set("country", country);
    }
    if (q) {
      // si más adelante queremos diferenciar por liga / equipo, se puede refinar;
      // de momento usamos "search" que es flexible
      params.set("search", q);
    }

    const url = `https://${API_HOST}/fixtures?${params.toString()}`;

    const apiRes = await fetch(url, {
      headers: {
        "x-apisports-key": API_KEY,
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": API_HOST,
      },
    });

    const json = await apiRes.json();

    if (!apiRes.ok) {
      console.error("API-FOOTBALL error", apiRes.status, json);
      return res.status(500).json({
        error: "API_FOOTBALL_ERROR",
        status: apiRes.status,
        details: json?.errors || json?.message || null,
      });
    }

    const response = Array.isArray(json.response) ? json.response : [];

    // Normalizamos un poco el objeto que devuelve API-FOOTBALL
    const items = response.map((it) => {
      const f = it.fixture || {};
      const lg = it.league || {};
      const teams = it.teams || {};
      const goals = it.goals || {};

      return {
        id: f.id,
        date: f.date, // ISO string; el comparador saca la hora de aquí
        timestamp: f.timestamp,
        status: f.status?.short,
        league: {
          id: lg.id,
          name: lg.name,
          country: lg.country,
          round: lg.round,
        },
        country: lg.country,
        teams: {
          home: teams.home
            ? {
                id: teams.home.id,
                name: teams.home.name,
                logo: teams.home.logo,
              }
            : null,
          away: teams.away
            ? {
                id: teams.away.id,
                name: teams.away.name,
                logo: teams.away.logo,
              }
            : null,
        },
        goals: {
          home: goals.home,
          away: goals.away,
        },
      };
    });

    // cache de 60s en edge para que no reviente la cuota del API
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json({ items });
  } catch (err) {
    console.error("Error en /api/fixtures", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}
