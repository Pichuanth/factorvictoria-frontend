// api/fixtures.js  (o api/fixtures/index.js)

import fetch from "node-fetch";

/**
 * GET /api/fixtures
 *
 * Query params soportados:
 * - date=YYYY-MM-DD        -> un solo día
 * - from=YYYY-MM-DD&to=... -> rango de fechas
 * - status=NS              -> por defecto NS (no empezado)
 * - country=Chile          -> opcional
 * - league=39              -> opcional
 * - q=texto                -> opcional (se pasa como search)
 */
export default async function handler(req, res) {
  try {
    const apiKey = process.env.APISPORTS_KEY;
    const apiHost = process.env.APISPORTS_HOST || "v3.football.api-sports.io";

    if (!apiKey) {
      console.error("Falta APISPORTS_KEY en variables de entorno");
      return res
        .status(500)
        .json({ error: "Server misconfigured: missing APISPORTS_KEY" });
    }

    const { date, from, to, status = "NS", country, league, q } = req.query;

    // Construir parámetros para API-FOOTBALL
    const params = new URLSearchParams();

    if (from && to) {
      params.set("from", from);
      params.set("to", to);
    } else if (date) {
      params.set("date", date);
    } else {
      // Si no mandan nada, usar hoy
      const today = new Date().toISOString().slice(0, 10);
      params.set("date", today);
    }

    if (status) params.set("status", status);
    if (country) params.set("country", country);
    if (league) params.set("league", league);
    if (q) params.set("search", q);

    const url = `https://${apiHost}/fixtures?${params.toString()}`;

    console.log("Llamando API-FOOTBALL:", url);

    const apiRes = await fetch(url, {
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => "");
      console.error("Error desde API-FOOTBALL:", apiRes.status, text);
      return res.status(apiRes.status).json({
        error: "API-FOOTBALL error",
        status: apiRes.status,
        body: text,
      });
    }

    const data = await apiRes.json();

    // Normalizar a formato { items: [...] }
    const items = Array.isArray(data?.response)
      ? data.response.map((f) => ({
          fixtureId: f.fixture?.id ?? f.id,
          teams: {
            home: f.teams?.home?.name ?? f.homeTeam?.name,
            away: f.teams?.away?.name ?? f.awayTeam?.name,
          },
          league: {
            name: f.league?.name ?? f.competition?.name,
          },
          fixture: {
            id: f.fixture?.id ?? f.id,
            timestamp: f.fixture?.timestamp,
            date: f.fixture?.date,
          },
          timestamp: f.fixture?.timestamp,
          date: f.fixture?.date,
          raw: f,
        }))
      : [];

    return res.status(200).json({ items });
  } catch (err) {
    console.error("Error en /api/fixtures:", err);
    return res
      .status(500)
      .json({ error: "Internal error in /api/fixtures", detail: String(err) });
  }
}
