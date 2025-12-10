// api/fixtures.js
// Devuelve partidos futuros usando API-FOOTBALL.
// Si algo falla, responde 200 con items: [] para que el frontend no muestre HTTP 500.

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { from, to, status, country, q } = req.query || {};

    const apiKey = process.env.APISPORTS_KEY;
    const apiHost = process.env.APISPORTS_HOST;

    // Si faltan credenciales, no rompemos: devolvemos vacío
    if (!apiKey || !apiHost) {
      console.error(
        "[fixtures] Falta APISPORTS_KEY o APISPORTS_HOST en las variables de entorno"
      );
      return res.status(200).json({ items: [] });
    }

    const url = new URL(`https://${apiHost}/v3/fixtures`);

    // Rango de fechas
    if (from) url.searchParams.set("from", from);
    if (to) url.searchParams.set("to", to);

    // Solo futuros si viene status
    if (status) url.searchParams.set("status", status);

    // Filtro por país si viene normalizado desde el frontend
    if (country) {
      url.searchParams.set("country", country);
    }

    // Búsqueda genérica: lo mandamos como "search"
    if (q) {
      url.searchParams.set("search", q);
    }

    const apiRes = await fetch(url.toString(), {
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    if (!apiRes.ok) {
      const body = await apiRes.text();
      console.error(
        "[fixtures] Error API-FOOTBALL:",
        apiRes.status,
        body.slice(0, 300)
      );
      // Muy importante: NO devolvemos 500, devolvemos vacío
      return res.status(200).json({ items: [] });
    }

    const data = await apiRes.json();
    const list = Array.isArray(data?.response) ? data.response : [];

    // Normalizamos un poco para que el Comparador entienda los datos
    const items = list.map((row) => {
      const fx = row.fixture || {};
      const league = row.league || {};
      const teams = row.teams || {};

      return {
        id: fx.id,
        date: fx.date, // ISO, el Comparador lo convierte a hora local
        hour: null, // por si acaso
        league: {
          id: league.id,
          name: league.name,
          country: league.country,
        },
        country: league.country,
        homeTeam: teams.home?.name,
        awayTeam: teams.away?.name,
      };
    });

    return res.status(200).json({ items });
  } catch (err) {
    console.error("[fixtures] Error inesperado:", err);
    // Nunca 500 hacia el frontend: respondemos vacío
    return res.status(200).json({ items: [] });
  }
}
