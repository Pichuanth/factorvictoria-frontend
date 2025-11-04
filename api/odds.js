import afetch from "./_afetch.js";

// GET /api/odds?fixture=123456
export default async function handler(req, res) {
  try {
    const fixture = Number(req.query.fixture || req.query.fixtureId);
    if (!fixture) return res.status(400).json({ error: "fixture requerido" });

    const json = await afetch("/odds", { fixture });
    // Buscar "Match Winner" / 1X2
    let out = { home: null, draw: null, away: null, bookmaker: "" };

    for (const r of json?.response || []) {
      const book = r.bookmakers?.[0];
      if (!book) continue;
      const market = (book.bets || []).find(b =>
        /match winner|1x2/i.test(b.name || "")
      );
      if (!market) continue;

      out.bookmaker = book.name || "";
      for (const o of market.values || []) {
        const odd = Number(o.odd);
        if (/home|^1$/i.test(o.value)) out.home = odd;
        if (/draw|^x$/i.test(o.value)) out.draw = odd;
        if (/away|^2$/i.test(o.value)) out.away = odd;
      }
      if (out.home || out.draw || out.away) break;
    }

    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
