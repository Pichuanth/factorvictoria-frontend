// api/h2h.js
import { afetch, jsonOrError } from "./_apifootball";

// /api/h2h?team1=33&team2=34&limit=5
export default async function handler(req, res) {
  try {
    const { team1, team2, limit = 5 } = req.query;
    if (!team1 || !team2) return res.status(400).json({ error: "Missing team1/team2" });
    const url = `/fixtures/headtohead?h2h=${encodeURIComponent(team1)}-${encodeURIComponent(team2)}&last=${encodeURIComponent(limit)}`;
    const out = await afetch(url).then(jsonOrError).catch(() => null);
    const rows = Array.isArray(out?.response) ? out.response : [];
    const list = rows.map((r) => ({
      date: r?.fixture?.date,
      score: `${r?.goals?.home ?? 0}-${r?.goals?.away ?? 0}`,
      home: r?.teams?.home?.name,
      away: r?.teams?.away?.name,
      league: r?.league?.name,
    }));
    res.status(200).json({ items: list.slice(0, Number(limit) || 5) });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
