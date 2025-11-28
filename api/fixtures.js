// frontend/api/fixtures.js
// Serverless API para traer fixtures desde API-FOOTBALL

const API_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const API_KEY = process.env.APISPORTS_KEY;

export default async function handler(req, res) {
  if (!API_KEY) {
    return res
      .status(500)
      .json({ error: "APISPORTS_KEY no está configurada en Vercel." });
  }

  try {
    let { from, to, date, status, country } = req.query;

    // Soportar el viejo parámetro `date`
    if (date && !from && !to) {
      from = date;
      to = date;
    }

    // Defaults MUY tolerantes: nunca tiramos 400 por fechas
    // - si no viene nada -> hoy
    // - si viene sólo from -> usamos ese mismo valor como to
    // - si viene sólo to   -> usamos ese mismo valor como from
    if (!from && !to) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      from = today;
      to = today;
    } else if (from && !to) {
      to = from;
    } else if (!from && to) {
      from = to;
    }

    // Armamos query hacia API-FOOTBALL
    const search = new URLSearchParams();
    search.set("from", from);
    search.set("to", to);
    search.set("timezone", "America/Santiago");

    if (status) {
      search.set("status", status);
    }
    if (country) {
      search.set("country", country);
    }

    const url = `https://${API_HOST}/fixtures?${search.toString()}`;

    const apiRes = await fetch(url, {
      headers: {
        "x-apisports-key": API_KEY,
        "x-rapidapi-key": API_KEY,   // por si alguno de los dos cabe
        "x-rapidapi-host": API_HOST,
      },
    });

    if (!apiRes.ok) {
      const bodyText = await apiRes.text().catch(() => "");
      console.error("Error API-FOOTBALL", apiRes.status, bodyText);
      return res.status(apiRes.status).json({
        error: "Error consultando API-FOOTBALL",
        status: apiRes.status,
        body: bodyText,
      });
    }

    const json = await apiRes.json();

    const items = Array.isArray(json?.response)
      ? json.response.map((fx) => ({
          fixtureId: fx.fixture?.id,
          date: fx.fixture?.date,
          timestamp: fx.fixture?.timestamp,
          league: {
            id: fx.league?.id,
            name: fx.league?.name,
            country: fx.league?.country,
          },
          teams: {
            home: fx.teams?.home?.name,
            away: fx.teams?.away?.name,
          },
          venue: fx.fixture?.venue?.name || null,
          country: fx.league?.country || null,
          raw: fx,
        }))
      : [];

    return res.status(200).json({ items });
  } catch (err) {
    console.error("Error en /api/fixtures", err);
    return res
      .status(500)
      .json({ error: String(err?.message || err || "Error desconocido") });
  }
}
