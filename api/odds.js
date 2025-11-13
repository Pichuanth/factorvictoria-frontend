// api/odds.js
import { afetch, jsonOrError } from "./_apifootball";

// Soporta: /api/odds?fixture=123&market=1x2
export default async function handler(req, res) {
  try {
    const { fixture, market = "1x2" } = req.query;
    if (!fixture) return res.status(400).json({ error: "Missing fixture" });

    // API-FOOTBALL: Bookmakers → odds por fixture
    const url = `/odds?fixture=${encodeURIComponent(fixture)}&type=${encodeURIComponent(market)}`;
    const out = await afetch(url).then(jsonOrError).catch(() => null);

    // Normalizamos a { markets: [{ outcomes: [{ name, odd }] }] }
    const markets = [];
    const rows = Array.isArray(out?.response) ? out.response : [];
    for (const row of rows) {
      const bk = row?.bookmakers || [];
      for (const b of bk) {
        const mks = b?.bets || [];
        for (const mk of mks) {
          const outs = (mk?.values || []).map((v) => ({
            name: v?.value,
            odd: Number(v?.odd),
          }));
          if (outs.length) markets.push({ outcomes: outs });
        }
      }
    }
    res.status(200).json({ markets });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
