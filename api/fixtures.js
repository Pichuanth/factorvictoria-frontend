// frontend/api/fixtures.js
const afetch = require("./_afetch");

// Devuelve la lista de partidos (fixtures) para una fecha.
// Query esperada:
//   /api/fixtures?date=2025-10-23&search=chile
// - date: obligatorio, formato YYYY-MM-DD
// - search: opcional (liga / país / texto). Por ahora lo ignoramos o lo usamos más adelante.
module.exports = async (req, res) => {
  try {
    const { date, search = "" } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Falta 'date' (YYYY-MM-DD)" });
    }

    // Llamada directa a API-Football
    // Endpoint base: https://v3.football.api-sports.io/fixtures?date=YYYY-MM-DD&timezone=America/Santiago
    // Nosotros lo centralizamos en afetch:
    const data = await afetch("/fixtures", {
      date,
      timezone: process.env.VITE_API_TZ || "America/Santiago",
      // 👇 más adelante podemos filtrar por league, team, country según 'search'
    });

    // data.response suele ser un array de fixtures
    // Vamos a mapear a un formato más simple para el frontend:
    const fixtures = (data.response || []).map(f => ({
      fixtureId: f.fixture?.id,
      league: f.league?.name,
      country: f.league?.country,
      round: f.league?.round,
      dateUTC: f.fixture?.date,
      status: f.fixture?.status?.short, // NS, 1H, FT, etc
      homeTeam: f.teams?.home?.name,
      awayTeam: f.teams?.away?.name,
      homeLogo: f.teams?.home?.logo,
      awayLogo: f.teams?.away?.logo,
    }));

    res.status(200).json({ fixtures });
  } catch (err) {
    console.error("ERROR /api/fixtures:", err);
    res.status(500).json({ error: err.message || "Error interno en /api/fixtures" });
  }
};
