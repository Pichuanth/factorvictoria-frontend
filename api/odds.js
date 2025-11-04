import { aFetch } from "./_afetch.js";

export default async function handler(req, res) {
  try {
    const fixture = Number(req.query.fixture || req.query.id);
    if (!fixture) return res.status(400).json({ error: "fixture requerido" });

    // buscamos 1X2 del primer bookmaker disponible
    const json = await aFetch("/odds", { fixture, page: 1 });
    const game = (json?.response || [])[0];
    if (!game) return res.status(200).json(null);

    const firstBk = (game.bookmakers || [])[0];
    if (!firstBk) return res.status(200).json(null);

    const m = (firstBk.bets || []).find(b => b.name === "Match Winner" || b.id === 1);
    if (!m) return res.status(200).json(null);

    const by = {};
    for (const v of m.values || []) {
      // posibles: "Home", "Draw", "Away"
      by[v.value?.toLowerCase()] = Number(v.odd);
    }

    res.status(200).json({
      home: by.home || null,
      draw: by.draw || null,
      away: by.away || null,
      bookmaker: firstBk.name
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
