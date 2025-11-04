// frontend/api/fixtures.js
import { callApiFootball } from './_afetch.js';

export default async function handler(req, res) {
  try {
    const date = req.query.date;
    const countryOrLeague = req.query.country ?? req.query.q ?? ''; // opcional

    if (!date) {
      return res.status(400).json({ error: 'date es requerido (YYYY-MM-DD)' });
    }

    const params = { date };

    // Si pasan número, lo tratamos como league id; si no, como country
    if (countryOrLeague) {
      if (/^\d+$/.test(countryOrLeague)) {
        params.league = countryOrLeague;
      } else {
        params.country = countryOrLeague;
      }
    }

    // API-Football: /fixtures
    const json = await callApiFootball('/fixtures', params);

    // Normalizamos una lista simple para el cliente
    const items = (json.response || []).map(r => ({
      fixtureId: r?.fixture?.id,
      when: r?.fixture?.date,
      home: r?.teams?.home?.name,
      away: r?.teams?.away?.name,
      league: r?.league?.name,
      country: r?.league?.country
    }));

    res.status(200).json({ items });
  } catch (e) {
    console.error('fixtures error:', e);
    res.status(500).json({ error: String(e.message || e) });
  }
}
