// frontend/api/odds.js
import { callApiFootball } from './_afetch.js';

export default async function handler(req, res) {
  try {
    const fixture = Number(req.query.fixture || req.query.id || req.query.fixtureId);
    if (!fixture) {
      return res.status(400).json({ error: 'fixture es requerido (numérico)' });
    }

    // API-Football: /odds con fixture
    const json = await callApiFootball('/odds', { fixture });

    // Tomamos el primer bookmaker disponible
    const first = json?.response?.[0];
    const bookmaker = first?.bookmakers?.[0];

    // Extraemos 1X2 (match-winner) si existe
    let home = null, draw = null, away = null, bookName = null;

    if (bookmaker) {
      bookName = bookmaker.name;
      const market1x2 =
        bookmaker.bets?.find(b => String(b?.name).toLowerCase().includes('match winner')) ||
        bookmaker.bets?.find(b => b?.id === 1); // id típico para 1x2

      if (market1x2?.values) {
        for (const v of market1x2.values) {
          const n = String(v?.value || '').toUpperCase();
          if (n.includes('HOME') || n === '1') home = Number(v?.odd);
          else if (n.includes('DRAW') || n === 'X') draw = Number(v?.odd);
          else if (n.includes('AWAY') || n === '2') away = Number(v?.odd);
        }
      }
    }

    res.status(200).json({ home, draw, away, bookmaker: bookName, rawCount: json?.response?.length || 0 });
  } catch (e) {
    console.error('odds error:', e);
    res.status(500).json({ error: String(e.message || e) });
  }
}
