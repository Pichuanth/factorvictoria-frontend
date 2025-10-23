const afetch = require("./_afetch");

module.exports = async (req, res) => {
  try {
    const { date, leagueId, teamId, country, season } = req.query;
    if (!date) return res.status(400).json({ error: "date es requerido (YYYY-MM-DD)" });

    const tz = process.env.API_TZ || "UTC";
    const yr = season ? Number(season) : new Date(date).getFullYear();

    const params = { date, timezone: tz, season: yr };

    if (leagueId) params.league = leagueId;
    if (teamId) params.team = teamId;
    if (country) params.country = country;

    const fixtures = await afetch("/fixtures", params);

    // Normaliza sólo lo necesario para el front
    const rows = fixtures.map(f => ({
      id: f.fixture?.id,
      date: f.fixture?.date,
      venue: f.fixture?.venue?.name || "",
      referee: f.fixture?.referee || "",
      league: f.league?.name || "",
      country: f.league?.country || "",
      home: {
        id: f.teams?.home?.id,
        name: f.teams?.home?.name,
      },
      away: {
        id: f.teams?.away?.id,
        name: f.teams?.away?.name,
      },
    }));

    res.status(200).json({ fixtures: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
