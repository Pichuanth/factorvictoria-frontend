// /api/odds.js — odds 1X2 (y otros markets) desde API-FOOTBALL v3
export default async function handler(req, res) {
  try {
    const { fixture, market = "1x2", bookmaker } = req.query;

    const API_KEY = process.env.APISPORTS_KEY;
    const HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
    if (!API_KEY) return res.status(400).json({ error: "Missing APISPORTS_KEY" });
    if (!fixture) return res.status(400).json({ error: "Missing fixture" });

    const qs = new URLSearchParams();
    qs.set("fixture", fixture);
    if (bookmaker) qs.set("bookmaker", bookmaker);

    // API-FOOTBALL 1X2 se obtiene en endpoint /odds con response/outcomes
    const url = `https://${HOST}/odds?${qs.toString()}`;

    const r = await fetch(url, {
      headers: { "x-apisports-key": API_KEY },
      cache: "no-store",
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Upstream ${r.status} ${r.statusText} – ${t}`);
    }

    const data = await r.json();

    // Aplanamos a un array de markets->outcomes con nombre/cuota
    // (la estructura completa varía; tomamos el primero por casa)
    const resp = Array.isArray(data?.response) ? data.response : [];
    const first = resp[0];

    const markets = [];
    // Busca outcome 1/X/2 si está disponible
    const bks = first?.bookmakers || [];
    for (const bk of bks) {
      for (const lm of bk?.bets || []) {
        const key = (lm?.name || lm?.bet || "").toLowerCase();
        // Filtramos a 1X2 si el market pedido es ese
        if (market.toLowerCase().includes("1x2")) {
          if (!/1x2|match winner|fulltime/i.test(key)) continue;
        }
        const outs = (lm?.values || lm?.outcomes || []).map((o) => ({
          label: o?.value || o?.label || o?.name,
          odd: Number(o?.odd || o?.price || o?.value),
        }));
        if (outs.length) markets.push({ key: lm?.name || lm?.bet, outcomes: outs });
      }
      // tomamos el primer bookmaker bueno
      if (markets.length) break;
    }

    return res.status(200).json({ markets });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
