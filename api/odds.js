// /api/odds.js
import afetch from './_afetch.js';

export default async function handler(req, res) {
  try {
    const fixture = Number(req.query.fixture || req.query.fixtureId);
    if (!fixture) return res.status(400).json({ error: 'fixture (id) es requerido' });

    const data = await afetch('/odds', { fixture });

    // Si quieres devolver rápido el market 1X2 del primer bookmaker:
    let out = { home: null, draw: null, away: null, bookmaker: '' };

    for (const b of data?.response ?? []) {
      const book = b.bookmakers?.[0];
      if (!book) continue;
      const market = book.bets?.find(m => /match winner|1x2/i.test(m?.name || ''));
      if (!market) continue;

      out.bookmaker = book?.name || '';
      for (const o of market.values || []) {
        const v = Number(o.odd);
        if (/home|^1$/i.test(o.value)) out.home = v;
        if (/draw|^x$/i.test(o.value)) out.draw = v;
        if (/away|^2$/i.test(o.value)) out.away = v;
      }
      if (out.home || out.draw || out.away) break;
    }

    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
