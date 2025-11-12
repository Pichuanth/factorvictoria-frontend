// /api/fixtures.js
// Devuelve: { items: [{ fixtureId, teams:{home,away}, league, country, date }] }

export default async function handler(req, res) {
  try {
    const { date, from, to, country, league } = req.query || {};
    const key = process.env.APISPORTS_KEY; // <-- ponlo en variables de entorno
    const host = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
    if (!key) {
      res.status(500).json({ error: "Missing APISPORTS_KEY" });
      return;
    }

    // Construye query para API-FOOTBALL
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (!date && (from || to)) {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    if (country) params.set("country", country);
    if (league) params.set("league", league);
    // Sugerencia: limitar páginas para no exceder rate limit
    params.set("timezone", "UTC");

    const url = `https://${host}/fixtures?${params.toString()}`;

    const r = await fetch(url, {
      headers: { "x-apisports-key": key },
      cache: "no-store",
    });
    const j = await r.json();

    if (!r.ok) {
      res
        .status(r.status)
        .json({ error: j?.errors || j?.message || "upstream error" });
      return;
    }

    const items = Array.isArray(j?.response)
      ? j.response.map((f) => ({
          fixtureId: f?.fixture?.id,
          teams: {
            home: f?.teams?.home?.name || "Home",
            away: f?.teams?.away?.name || "Away",
          },
          league: f?.league?.name || "",
          country: f?.league?.country || "",
          date: f?.fixture?.date?.slice(0, 10) || "",
        }))
      : [];

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
