// frontend/api/odds.js
import { afetch } from "./_afetch.js";

// GET /api/odds?fixture=123456
export default async function handler(req, res) {
  try {
    const fixture = Number(req.query?.fixture || req.query?.fixtureId || req.query?.id);
    if (!fixture) return res.status(400).json({ error: "fixture es requerido (número)" });

    const json = await afetch("/odds", { fixture });
    const items = Array.isArray(json?.response) ? json.response : [];

    // Buscamos el primer bookmaker con market 1X2 / Match Winner
    let out = { home: null, draw: null, away: null, bookmaker: "" };

    for (const entry of items) {
      const book = entry?.bookmakers?.[0];
      if (!book) continue;

      const market = (book.bets || book.markets || []).find(m =>
        /match winner|1x2/i.test(m?.name || "")
      );
      if (!market) continue;

      out.bookmaker = book?.name || "";

      for (const o of market.values || market.outcomes || []) {
        const label = String(o?.value || o?.label || "").toLowerCase();
        const v = Number(o?.odd || o?.price || o?.value);
        if (Number.isFinite(v)) {
          if (/(^home\b|\b1\b)/.test(label)) out.home = v;
          if (/(^draw\b|\bx\b)/.test(label)) out.draw = v;
          if (/(^away\b|\b2\b)/.test(label)) out.away = v;
        }
      }
      if (out.home || out.draw || out.away) break;
    }

    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
