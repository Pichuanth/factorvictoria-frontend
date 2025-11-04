import { aFetch } from "./_afetch";

// GET /api/fixtures?date=YYYY-MM-DD&country=Chile&league=39&days=3
export default async function handler(req, res) {
  try {
    const { date, country, league, days } = req.query;
    if (!date) return res.status(400).json({ error: "date requerido" });

    const addDays = Number(days ?? 0);
    const out = [];

    for (let i = 0; i <= addDays; i++) {
      const d = new Date(date);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);

      const params = { date: iso };
      if (country) params.country = country;
      if (league) params.league = league;

      const chunk = await aFetch("/fixtures", params);
      out.push(...chunk);
    }

    res.status(200).json(out);
  } catch (e) {
    console.error("fixtures error:", e);
    res.status(500).json({ error: String(e.message || e) });
  }
}
