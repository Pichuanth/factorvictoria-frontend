import afetch from "./_afetch.js";

// GET /api/odds?fixture=12345
// Devuelve cuotas 1X2 (primer bookmaker disponible)
export default async function handler(req, res) {
  try {
    const fixture = Number(req.query.fixture);
    if (!fixture) return res.status(400).json({ error: "fixture requerido" });

    const j = await afetch("/odds", { fixture });
    const row = j?.response?.[0];
    if (!row) return res.status(200).json({ home: null, draw: null, away: null, bookmaker: "" });

    const book = row.bookmakers?.[0];
    const market = book?.bets?.find(m => /match winner|1x2/i.test(m?.name || ""));
    const out = { home: null, draw: null, away: null, bookmaker: book?.name || "" };

    for (const o of market?.values || []) {
      const v = Number(o.odd);
      if (/home|1\b/i.test(o.value)) out.home = v;
      if (/draw|x\b/i.test(o.value)) out.draw = v;
      if (/away|2\b/i.test(o.value)) out.away = v;
    }

    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
