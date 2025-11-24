// api/fixtures.js
// Serverless function para obtener partidos desde API-SPORTS (v3)

const API_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const API_KEY = process.env.APISPORTS_KEY;

/**
 * Normaliza una fecha tipo "2025-11-21" a YYYY-MM-DD
 */
function normalizeDate(input) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Handler principal
 */
export default async function handler(req, res) {
  try {
    if (!API_KEY) {
      console.error("Falta APISPORTS_KEY en las env vars de Vercel");
      return res.status(500).json({ error: "Missing APISPORTS_KEY" });
    }

    const { date, status, country, league } = req.query;

    // De momento soportamos solo "date" (lo que usa el comparador)
    const normDate = normalizeDate(date);
    if (!normDate) {
      return res.status(400).json({ error: "Parámetro 'date' inválido o faltante" });
    }

    // Construimos query hacia API-SPORTS
    const params = new URLSearchParams();
    params.set("date", normDate);
    if (status) params.set("status", String(status));
    if (country) params.set("country", String(country));
    if (league) params.set("league", String(league));

    const url = `https://${API_HOST}/fixtures?${params.toString()}`;

    console.log("[/api/fixtures] Llamando a API-SPORTS:", url);

    const apiRes = await fetch(url, {
      method: "GET",
      headers: {
        "x-apisports-key": API_KEY,
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": API_HOST,
      },
    });

    const body = await apiRes.json().catch(() => ({}));

    if (!apiRes.ok) {
      console.error(
        "[/api/fixtures] Error de API-SPORTS:",
        apiRes.status,
        apiRes.statusText,
        JSON.stringify(body).slice(0, 500)
      );
      return res.status(apiRes.status).json({
        error: "API_SPORTS_ERROR",
        status: apiRes.status,
        info: body,
      });
    }

    const responseArray = Array.isArray(body?.response) ? body.response : [];

    // Normalizamos al formato que espera el comparador
    const items = responseArray.map((fx) => ({
      fixtureId: fx?.fixture?.id,
      teams: {
        home: fx?.teams?.home?.name || "",
        away: fx?.teams?.away?.name || "",
      },
      league: {
        name: fx?.league?.name || "",
        country: fx?.league?.country || "",
      },
      timestamp: fx?.fixture?.timestamp || null,
      date: fx?.fixture?.date || null,
    }));

    console.log(
      "[/api/fixtures] Devueltos",
      items.length,
      "partidos para fecha",
      normDate
    );

    return res.status(200).json({ items });
  } catch (err) {
    console.error("[/api/fixtures] Excepción no controlada:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: err?.message || String(err),
    });
  }
}
