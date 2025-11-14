// api/odds.js
import { apisGet } from "./_utils/apisports";

export default async function handler(req, res) {
  try {
    const { fixture, market = "1x2" } = req.query;
    if (!fixture) return res.status(400).json({ error: "Falta fixture" });

    // APISports: /odds con fixture y tipo de mercado
    const od = await apisGet("/odds", { fixture, bet: market });
    // Normalizamos a { markets: [{ outcomes: [{name, odd}]}] }
    const response = Array.isArray(od?.response) ? od.response : [];
    const markets = [];

    for (const book of response) {
      for (const m of (book?.bookmakers || [])) {
        for (const bet of (m?.bets || [])) {
          const outs = (bet?.values || []).map(v => ({
            name: v?.value,
            odd: Number(v?.odd),
          }));
          markets.push({ outcomes: outs, bookmaker: m?.name, label: bet?.name });
        }
      }
    }

    res.status(200).json({ markets });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
