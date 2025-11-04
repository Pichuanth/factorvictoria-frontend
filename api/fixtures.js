import afetch from "./_afetch.js";

// GET /api/fixtures?date=YYYY-MM-DD&country=Chile&league=...&season=...
// Extra: también acepta ?days=N para rango de N días a partir de "date".
export default async function handler(req, res) {
  try {
    const { date, country, league, season, days } = req.query;
    if (!date && !league && !country) {
      return res.status(400).json({ error: "Falta 'date' o algún filtro (league/country)" });
    }

    const baseParams = {};
    if (country) baseParams.country = country;
    if (league) baseParams.league = league;
    if (season) baseParams.season = season;

    // Rango de fechas opcional
    const nDays = Number(days || 1);
    if (!date && nDays > 1) {
      return res.status(400).json({ error: "Para 'days', debes indicar 'date' inicial" });
    }

    let all = [];
    if (date) {
      const start = new Date(date);
      for (let i = 0; i < nDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const ds = d.toISOString().slice(0, 10);

        const json = await afetch("/fixtures", { ...baseParams, date: ds });
        all = all.concat(json.response || []);
      }
      return res.status(200).json({ response: all });
    }

    // Sin fecha: un solo tiro con los filtros dados
    const json = await afetch("/fixtures", baseParams);
    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
