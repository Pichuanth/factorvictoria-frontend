import afetch from './_afetch.js';

// GET /api/fixtures?date=YYYY-MM-DD&country=Chile
//    o /api/fixtures?from=YYYY-MM-DD&to=YYYY-MM-DD&country=Chile
export default async function handler(req, res) {
  try {
    const { date, from, to, country, league, season } = req.query;

    if (!date && !(from && to)) {
      return res.status(400).json({ error: 'Provide date or from+to' });
    }

    const params = {};
    if (date) params.date = date;
    if (from) params.from = from;
    if (to) params.to = to;
    if (country) params.country = country;
    if (league) params.league = league;
    if (season) params.season = season;

    const data = await afetch('/fixtures', params);

    const list = Array.isArray(data?.response)
      ? data.response.map(f => ({
          id: f?.fixture?.id,
          date: f?.fixture?.date,
          league: f?.league?.name,
          country: f?.league?.country,
          home: f?.teams?.home?.name,
          away: f?.teams?.away?.name,
        }))
      : [];

    res.status(200).json({ response: list });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
