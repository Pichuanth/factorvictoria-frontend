import afetch from "./_afetch.js";

// GET /api/fixtures?date=YYYY-MM-DD&country=Chile  (country opcional)
export default async function handler(req, res) {
  try {
    const date = req.query.date;
    const country = req.query.country; // opcional

    if (!date) return res.status(400).json({ error: "date requerido" });

    const params = { date };
    if (country) params.country = country;

    const json = await afetch("/fixtures", params);
    const list = (json?.response || []).map(x => ({
      fixtureId: x.fixture?.id,
      date: x.fixture?.date,
      league: x.league?.name,
      country: x.league?.country,
      home: x.teams?.home?.name,
      away: x.teams?.away?.name,
    }));

    res.status(200).json({ count: list.length, items: list });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
