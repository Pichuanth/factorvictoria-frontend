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

    const { date, from, to, status, country, q } = req.query || {};

    const params = new URLSearchParams();
    params.set("timezone", TIMEZONE);

    // status opcional (NS, FT, etc.)
    if (status) params.set("status", status);

    // LÓGICA DE FECHAS:
    // 1) Si viene "date", usamos esa fecha.
    // 2) Si from y to son iguales, también usamos "date".
    // 3) Si from/to son distintos, usamos el rango from/to.
    if (date) {
      params.set("date", date);
    } else if (from && to && from === to) {
      params.set("date", from);
    } else {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
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

    // Normalizamos los datos básicos del partido
    let items = response.map((it) => {
      const f = it.fixture || {};
      const lg = it.league || {};
      const teams = it.teams || {};
      const goals = it.goals || {};

      return {
        id: f.id,
        date: f.date,
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

    // FILTRO POR PAÍS (se hace en nuestro código, no en la API)
    if (country) {
      const cNorm = String(country).toLowerCase();
      items = items.filter((it) =>
        String(it.league?.country || it.country || "")
          .toLowerCase()
          .includes(cNorm)
      );
    }

    // FILTRO POR TEXTO (liga/equipo)
    if (q) {
      const qNorm = String(q).toLowerCase();
      items = items.filter((it) => {
        const texto = [
          it.league?.name,
          it.league?.country,
          it.teams?.home?.name,
          it.teams?.away?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return texto.includes(qNorm);
      });
    }

    // Cache cortita para no reventar la cuota del API
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json({ items });
  } catch (err) {
    console.error("Error en /api/fixtures", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}
