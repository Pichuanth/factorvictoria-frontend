// frontend/api/odds.js  (serverless backend en Vercel)
import afetch from "./_afetch";

// Lee cuotas 1X2 del primer bookmaker disponible
async function getOddsForFixture(fixtureId) {
  const json = await afetch("/odds", { fixture: fixtureId });
  const row = json?.response?.[0];
  const out = { home: null, draw: null, away: null, bookmaker: "" };
  if (!row?.bookmakers) return out;

  for (const b of row.bookmakers) {
    const market = b.bets?.find(m => /match winner|1x2/i.test(m?.name || ""));
    if (!market) continue;

    out.bookmaker = b.name || "";
    for (const v of market.values || []) {
      const oddNum = Number(v.odd);
      if (/home|^1$/i.test(v.value)) out.home = oddNum;
      if (/draw|^X$/i.test(v.value)) out.draw = oddNum;
      if (/away|^2$/i.test(v.value)) out.away = oddNum;
    }
    if (out.home || out.draw || out.away) break;
  }
  return out;
}

export default async function handler(req, res) {
  try {
    const fixture = Number(req.query.fixture || req.query.fixtureId || req.query.id);
    if (!fixture) return res.status(400).json({ error: "fixture requerido" });

    const data = await getOddsForFixture(fixture);
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
