export const config = { runtime: "nodejs" };

import aFetch from "./_afetch.js";

export default async function handler(req, res) {
  try {
    const { date, country, league, from, to } = req.query; // soporta rango opcional

    if (!date && !from && !to) {
      return res.status(400).json({ error: "Falta 'date' o 'from/to' (YYYY-MM-DD)" });
    }

    const search = {};
    if (date) search.date = date;
    if (from) search.from = from;
    if (to) search.to = to;

    if (country) search.country = country;       // Chile, Spain, etc.
    if (league)  search.league = league;         // id de liga

    const data = await aFetch("/fixtures", search);

    // Normalizamos salida (solo lo que la UI necesita)
    const list = (data?.response || []).map(r => ({
      fixtureId: r?.fixture?.id,
      date: r?.fixture?.date,
      league: r?.league?.name,
      country: r?.league?.country,
      teams: {
        home: r?.teams?.home?.name,
        away: r?.teams?.away?.name,
      },
    }));

    return res.status(200).json({ count: list.length, items: list });
  } catch (err) {
    console.error("fixtures error:", err);
    const msg = (err && err.message) || "Internal error";
    return res.status(500).json({ error: msg });
  }
}
