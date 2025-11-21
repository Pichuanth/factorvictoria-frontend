// api/fixtures.js
// Función serverless para traer partidos desde API-FOOTBALL (API-SPORTS)

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const API_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const API_KEY = process.env.APISPORTS_KEY;

// Mapea un fixture de API-FOOTBALL al formato que usa el frontend
function mapFixture(fx) {
  return {
    fixtureId: fx?.fixture?.id,
    timestamp: fx?.fixture?.timestamp,
    date: fx?.fixture?.date,
    league: {
      id: fx?.league?.id,
      name: fx?.league?.name,
      country: fx?.league?.country,
    },
    teams: {
      home: fx?.teams?.home?.name,
      away: fx?.teams?.away?.name,
    },
  };
}

module.exports = async (req, res) => {
  try {
    if (!API_KEY) {
      console.error("Falta APISPORTS_KEY en las variables de entorno");
      return res
        .status(500)
        .json({ error: "Config del servidor incompleta (API key)" });
    }

    const { date, from, to, country, league, status } = req.query;

    const params = new URLSearchParams();

    // Soportar tanto ?date=YYYY-MM-DD como ?from=&to=
    if (date) {
      params.set("date", date);
    } else if (from && to) {
      params.set("from", from);
      params.set("to", to);
    } else {
      // Por defecto: hoy (por si alguien llama sin fecha)
      const today = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const d = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
        today.getDate()
      )}`;
      params.set("date", d);
    }

    if (status) params.set("status", status); // ej: NS (no started)
    if (country) params.set("country", country); // ej: Chile, France…
    if (league) params.set("league", league); // ej: id de liga

    const url = `https://${API_HOST}/fixtures?${params.toString()}`;

    console.log("[/api/fixtures] Llamando a API-FOOTBALL:", url);

    const apiRes = await fetch(url, {
      headers: {
        "x-apisports-key": API_KEY,
      },
    });

    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error(
        "Error respuesta API-FOOTBALL:",
        apiRes.status,
        apiRes.statusText,
        text
      );
      return res.status(502).json({
        error: "Error al consultar proveedor de datos",
        status: apiRes.status,
        statusText: apiRes.statusText,
      });
    }

    const body = await apiRes.json();

    const response = Array.isArray(body?.response) ? body.response : [];
    const items = response.map(mapFixture);

    console.log(
      "[/api/fixtures] Partidos devueltos:",
      items.length,
      "params:",
      Object.fromEntries(params)
    );

    return res.status(200).json({ items });
  } catch (err) {
    console.error("[/api/fixtures] EXCEPCIÓN:", err);
    return res.status(500).json({
      error: "Error interno en la función fixtures",
      message: err.message || String(err),
    });
  }
};
