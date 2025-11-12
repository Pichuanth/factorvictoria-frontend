// /api/odds.js
// Espera: ?fixture=12345&market=1x2
// Devuelve: { markets: [{ out: "1"|"X"|"2", odd: number }] }

export default async function handler(req, res) {
  try {
    const { fixture, market } = req.query || {};
    if (!fixture) {
      res.status(400).json({ error: "missing fixture" });
      return;
    }
    // solo soportamos 1X2 por ahora
    if (market && String(market).toLowerCase() !== "1x2") {
      res.status(200).json({ markets: [] });
      return;
    }

    const key = process.env.APISPORTS_KEY;
    const host = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
    if (!key) {
      res.status(500).json({ error: "Missing APISPORTS_KEY" });
      return;
    }

    // API-FOOTBALL: /odds?fixture=ID
    const url = `https://${host}/odds?fixture=${encodeURIComponent(fixture)}&timezone=UTC`;
    const r = await fetch(url, {
      headers: { "x-apisports-key": key },
      cache: "no-store",
    });
    const j = await r.json();
    if (!r.ok) {
      res
        .status(r.status)
        .json({ error: j?.errors || j?.message || "upstream error" });
      return;
    }

    // Estructura típica:
    // response: [{ bookmakers:[{ bets:[{ name:"Match Winner", values:[{value:"Home", odd:"1.65"}, ...]}]}] }]
    const resp = Array.isArray(j?.response) ? j.response : [];
    const allBookmakers = resp[0]?.bookmakers || [];

    // Busca el bet de "Match Winner" / id 1 (varía), normaliza 1/X/2 y promedia odds
    let homes = [], draws = [], aways = [];
    for (const bk of allBookmakers) {
      const bets = Array.isArray(bk?.bets) ? bk.bets : [];
      const mw =
        bets.find((b) =>
          String(b?.name || "").toLowerCase().includes("match winner")
        ) || bets.find((b) => b?.id === 1);

      if (!mw || !Array.isArray(mw?.values)) continue;

      for (const v of mw.values) {
        const name = String(v?.value || "").toLowerCase();
        const odd = Number(v?.odd ?? v?.price ?? v?.value);
        if (!isFinite(odd) || odd <= 1.01) continue;
        if (name.includes("home") || name === "1") homes.push(odd);
        else if (name.includes("draw") || name === "x") draws.push(odd);
        else if (name.includes("away") || name === "2") aways.push(odd);
      }
    }

    const avg = (arr) =>
      arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : undefined;

    const markets = [];
    const homeAvg = avg(homes);
    const drawAvg = avg(draws);
    const awayAvg = avg(aways);
    if (homeAvg) markets.push({ out: "1", odd: homeAvg });
    if (drawAvg) markets.push({ out: "X", odd: drawAvg });
    if (awayAvg) markets.push({ out: "2", odd: awayAvg });

    res.status(200).json({ markets });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
