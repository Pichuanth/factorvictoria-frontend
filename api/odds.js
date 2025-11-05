export const config = { runtime: "nodejs" };

import aFetch from "./_afetch.js";

export default async function handler(req, res) {
  try {
    const { fixture } = req.query;
    if (!fixture) {
      return res.status(400).json({ error: "Falta 'fixture' (id del partido)" });
    }

    // Mercados 1X2 (gana local/empate/gana visita)
    const data = await aFetch("/odds", {
      fixture,
      bet: 1,         // 1X2
      page: 1,
    });

    // Elegimos la primera casa disponible y extraemos cuotas 1/ X / 2
    const first = data?.response?.[0];
    const bookmaker = first?.bookmakers?.[0];
    const bets = bookmaker?.bets?.find(b => b.id === 1) || bookmaker?.bets?.[0];

    const out = { bookmaker: bookmaker?.name || null, markets: [] };
    if (bets?.values?.length) {
      for (const v of bets.values) {
        if (!v?.value || !v?.odd) continue;
        out.markets.push({ label: v.value, odd: Number(v.odd) || null });
      }
    }

    return res.status(200).json(out);
  } catch (err) {
    console.error("odds error:", err);
    const msg = (err && err.message) || "Internal error";
    return res.status(500).json({ error: msg });
  }
}
