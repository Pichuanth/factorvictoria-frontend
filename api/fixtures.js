// /api/fixtures.js
export default async function handler(req, res) {
  try {
    const key = process.env.APIFOOTBALL_KEY;
    if (!key) throw new Error("Falta APIFOOTBALL_KEY");

    const { date, country, league, days } = req.query;
    if (!date) return res.status(400).json({ error: "date es requerido (YYYY-MM-DD)" });

    const nDays = Math.max(1, Math.min(Number(days) || 1, 10)); // 1..10
    const start = new Date(date);
    const all = [];

    for (let i = 0; i < nDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);

      const qs = new URLSearchParams({ date: d.toISOString().slice(0, 10) });
      if (country) qs.set("country", country);
      if (league) qs.set("league", String(league));

      const r = await fetch(`https://v3.football.api-sports.io/fixtures?${qs}`, {
        headers: { "x-apisports-key": key }
      });
      const j = await r.json();
      if (Array.isArray(j?.response)) all.push(...j.response);
    }

    res.status(200).json({ ok: true, count: all.length, response: all });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
