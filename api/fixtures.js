import { aFetch } from "./_afetch.js";

export default async function handler(req, res) {
  try {
    const { date, country, days } = req.query;
    if (!date) return res.status(400).json({ error: "date requerido (YYYY-MM-DD)" });

    // rango opcional de días (p.ej. days=4)
    const out = [];
    const span = Math.max(1, Math.min(Number(days || 1), 10)); // 1..10
    const start = new Date(date);

    for (let i = 0; i < span; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dStr = d.toISOString().slice(0,10);

      const params = { date: dStr, timezone: "UTC" };
      if (country) params.country = country;

      const json = await aFetch("/fixtures", params);
      out.push(...(json?.response || []));
    }

    res.status(200).json(out); // array de fixtures
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
