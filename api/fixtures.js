// /api/fixtures.js  — proxy a API-FOOTBALL v3 con fallback elegante
export default async function handler(req, res) {
  try {
    const { date, from, to, league, country } = req.query;

    const API_KEY = process.env.APISPORTS_KEY;             // <- DEBE existir en Vercel
    const HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";

    if (!API_KEY) {
      return res.status(400).json({ error: "Missing APISPORTS_KEY" });
    }

    const qs = new URLSearchParams();
    if (date) qs.set("date", date);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (league) qs.set("league", league);
    if (country) qs.set("country", country);

    const url = `https://${HOST}/fixtures?${qs.toString()}`;

    const r = await fetch(url, {
      headers: {
        "x-apisports-key": API_KEY,
      },
      // Evita caché agresiva en Vercel Edge
      cache: "no-store",
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Upstream ${r.status} ${r.statusText} – ${t}`);
    }

    const data = await r.json();

    // Normaliza a un formato sencillo para el frontend
    const items = (data?.response || []).map((it) => ({
      fixtureId: it?.fixture?.id,
      date: it?.fixture?.date,
      league: it?.league?.name,
      country: it?.league?.country,
      teams: {
        home: it?.teams?.home?.name,
        away: it?.teams?.away?.name,
      },
    }));

    return res.status(200).json({ count: items.length, items });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
