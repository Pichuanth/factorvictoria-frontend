import afetch from "./_afetch.js";

// GET /api/odds?fixture=12345
export default async function handler(req, res) {
  try {
    const fixture = Number(req.query.fixture || req.query.id);
    if (!fixture) return res.status(400).json({ error: "fixture requerido" });

    const out = await getOddsForFixture(fixture);
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}

async function getOddsForFixture(fixtureId) {
  const json = await afetch("/odds", { fixture: fixtureId });
  const first = json?.response?.[0];
  const book  = first?.bookmakers?.[0];
  if (!book) return { home: null, draw: null, away: null, bookmaker: "" };

  const market =
    (book.bets || []).find(m => /match winner|1x2/i.test(m.name || "")) || null;

  const out = { home: null, draw: null, away: null, bookmaker: book?.name || "" };
  for (const o of market?.values || []) {
    const v = Number(o.odd);
    if (/^home$|(^|[^a-z])1($|[^a-z])/i.test(o.value)) out.home = v;
    if (/^draw$|(^|[^a-z])x($|[^a-z])/i.test(o.value))  out.draw = v;
    if (/^away$|(^|[^a-z])2($|[^a-z])/i.test(o.value)) out.away = v;
  }
  return out;
}
