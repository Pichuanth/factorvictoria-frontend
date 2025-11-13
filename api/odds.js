// /api/odds.js — obtiene mercado 1x2 para un fixture
// Uso: /api/odds?fixture=12345&market=1x2

export default async function handler(req, res) {
  try {
    const { APISPORTS_KEY, APISPORTS_HOST } = process.env;
    if (!APISPORTS_KEY || !APISPORTS_HOST) {
      return res.status(400).json({ error: "Missing APISPORTS_KEY or APISPORTS_HOST" });
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const fixture = url.searchParams.get("fixture");
    const market  = (url.searchParams.get("market") || "1x2").toLowerCase();
    if (!fixture) return res.status(400).json({ error: "Missing fixture" });

    // API-FOOTBALL odds endpoint
    // https://v3.football.api-sports.io/odds?fixture={id}
    const apiUrl = `https://${APISPORTS_HOST}/odds?fixture=${encodeURIComponent(fixture)}`;

    const r = await fetch(apiUrl, {
      headers: {
        "x-rapidapi-key": APISPORTS_KEY,
        "x-rapidapi-host": APISPORTS_HOST
      },
      cache: "no-store"
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(502).json({ error: `Upstream ${r.status} ${r.statusText}`, body: txt });
    }

    const json = await r.json();
    const marketsOut = [];

    // Adaptar a una forma simple: [{out:'1', odd:1.85}, {out:'X', odd:3.2}, {out:'2', odd:2.1}]
    (json?.response || []).forEach((book) => {
      (book?.bookmakers || []).forEach((bm) => {
        (bm?.bets || []).forEach((bet) => {
          const name = String(bet?.name || "").toLowerCase();
          if (name.includes("1x2") || name.includes("match winner") || market === "1x2") {
            (bet?.values || []).forEach((v) => {
              const label = String(v?.value || v?.odd || v?.label || "").toLowerCase();
              let out = null;
              if (label.includes("home") || label === "1") out = "1";
              else if (label.includes("draw") || label === "x") out = "X";
              else if (label.includes("away") || label === "2") out = "2";
              const price = Number(v?.odd ?? v?.value);
              if (out && isFinite(price) && price > 1.01) {
                marketsOut.push({ out, odd: Number(price.toFixed(2)) });
              }
            });
          }
        });
      });
    });

    return res.json({ markets: marketsOut });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
