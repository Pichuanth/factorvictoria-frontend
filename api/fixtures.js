// /api/fixtures.js
import afetch from './_afetch.js';

export default async function handler(req, res) {
  try {
    const { date, country, league, team, days = '1' } = req.query;
    if (!date) return res.status(400).json({ error: 'date es requerido (YYYY-MM-DD)' });

    const out = [];
    const n = Math.max(1, Math.min(10, Number(days))); // 1..10 como pediste

    for (let i = 0; i < n; i++) {
      const d = new Date(date);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().slice(0, 10);

      const resp = await afetch('/fixtures', {
        date: ds,
        ...(country ? { country } : {}),
        ...(league ? { league } : {}),
        ...(team ? { team } : {}),
      });

      out.push(...(resp?.response ?? []));
    }

    res.status(200).json({ count: out.length, response: out });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
