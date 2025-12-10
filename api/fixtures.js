// api/fixtures.js
import { afetch, jsonOrError } from "./_apifootball";

// Normaliza un fixture de API-FOOTBALL a un formato sencillo
function mapFixture(apiFx) {
  const fx = apiFx?.fixture || {};
  const league = apiFx?.league || {};
  const teams = apiFx?.teams || {};

  return {
    id: fx.id,
    date: fx.date,
    timestamp: fx.timestamp,
    league: {
      id: league.id,
      name: league.name,
      country: league.country,
    },
    country: league.country,
    teams: {
      home: {
        name: teams.home?.name || "Local",
      },
      away: {
        name: teams.away?.name || "Visita",
      },
    },
    status: fx.status?.short,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { from, to, status = "NS", country, q } = req.query;

    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (status) params.set("status", status);
    // Siempre usamos la zona horaria de Santiago
    params.set("timezone", "America/Santiago");

    // Si viene país normalizado desde el comparador (Chile, Spain, etc.)
    if (country) {
      params.set("country", country);
    }

    // Por ahora el texto libre `q` no lo mandamos a la API
    // (sirve solo para filtrar después si quieres).
    // Si más adelante queremos usarlo, habría que decidir si se trata
    // de equipo, liga, etc. y usar los parámetros de API-FOOTBALL.

    const path = `/fixtures?${params.toString()}`;

    const resApi = await afetch(path);
    const data = await jsonOrError(resApi);

    const fixtures = Array.isArray(data?.response)
      ? data.response.map(mapFixture)
      : [];

    return res.status(200).json({ items: fixtures });
  } catch (err) {
    console.error("Error en /api/fixtures:", err);
    return res.status(500).json({
      error: "Error interno al obtener fixtures",
      message: String(err?.message || err),
    });
  }
}
