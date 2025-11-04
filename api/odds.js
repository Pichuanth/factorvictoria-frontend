import { aFetch } from "./_afetch";

// GET /api/odds?fixture=123456
export default async function handler(req, res) {
  try {
    const fixture = Number(req.query.fixture || req.query.id);
    if (!fixture) return res.status(400).json({ error: "fixture requerido" });

    const items = await aFetch("/odds", { fixture });
    // Tomamos primer bookmaker disponible
    const bm = items?.[0]?.bookmakers?.[0];
    const bets = bm?.bets ?? [];

    // Buscar mercado 1X2 (suele llamarse "Match Winner" o id=1)
    const oneX2 =
      bets.find((b) => b.id === 1) ||
      bets.find((b) =>
        (b.name || "").toLowerCase().includes("match winner")
      );

    if (!oneX2) return res.status(200).json(null);

    const odds = {};
    for (const v of oneX2.values || []) {
      const val = (v.value || "").toUpperCase();
      if (val === "HOME" || val === "1") odds.home = Number(v.odd);
      else if (val === "AWAY" || val === "2") odds.away = Number(v.odd);
      else if (val === "DRAW" || val === "X") odds.draw = Number(v.odd);
    }
    odds.bookmaker = bm?.name ?? null;

    res.status(200).json(odds);
  } catch (e) {
    console.error("odds error:", e);
    res.status(500).json({ error: String(e.message || e) });
  }
}
