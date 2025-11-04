// /api/odds.js
export default async function handler(req, res) {
  try {
    const key = process.env.APIFOOTBALL_KEY;
    if (!key) throw new Error("Falta APIFOOTBALL_KEY");

    const fixture = req.query.fixture || req.query.id;
    if (!fixture) return res.status(400).json({ error: "fixture requerido" });

    const r = await fetch(`https://v3.football.api-sports.io/odds?fixture=${fixture}`, {
      headers: { "x-apisports-key": key }
    });
    const j = await r.json();

    let out = null;
    const blk = j?.response?.[0]?.bookmakers?.[0];
    if (blk?.bets?.length) {
      const market =
        blk.bets.find(b => b.name === "Match Winner" || b.name === "1X2" || b.id === 1) ||
        blk.bets[0];

      if (market?.values?.length) {
        const val = name =>
          market.values.find(v => v.value === name || v.value === name?.charAt(0));
        out = {
          bookmaker: blk.name,
          home: val("Home")?.odd ?? val("1")?.odd ?? null,
          draw: val("Draw")?.odd ?? val("X")?.odd ?? null,
          away: val("Away")?.odd ?? val("2")?.odd ?? null,
        };
      }
    }

    res.status(200).json(out ?? { message: "sin datos de 1X2" });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
