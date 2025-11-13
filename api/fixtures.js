// /api/fixtures.js  — Serverless Node (Vercel)
// Lee APISPORTS_KEY / APISPORTS_HOST desde env. Si faltan -> 400 informativo.
// Soporta ?date=YYYY-MM-DD  o  ?from=YYYY-MM-DD&to=YYYY-MM-DD  (+ &country=Chile | &league=140)
// ?demo=1 fuerza modo demo.

export default async function handler(req, res) {
  try {
    const { APISPORTS_KEY, APISPORTS_HOST } = process.env;
    if (!APISPORTS_KEY || !APISPORTS_HOST) {
      return res.status(400).json({ error: "Missing APISPORTS_KEY or APISPORTS_HOST" });
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const date = url.searchParams.get("date");
    const from = url.searchParams.get("from");
    const to   = url.searchParams.get("to");
    const country = url.searchParams.get("country");
    const league  = url.searchParams.get("league");
    const demo = url.searchParams.get("demo");

    // DEMO opcional para pruebas
    if (demo === "1") {
      const items = Array.from({ length: 10 }, (_, i) => ({
        fixtureId: `demo-${i+1}`,
        date: date || from || new Date().toISOString().slice(0,10),
        country: country || "DemoLand",
        league: league || "999",
        teams: { home: `Equipo A${i+1}`, away: `Equipo B${i+1}` }
      }));
      return res.json({ count: items.length, items });
    }

    // Construir endpoint de API-FOOTBALL
    // Docs: https://www.api-football.com/documentation-v3
    let apiUrl = "";
    if (date) {
      apiUrl = `https://${APISPORTS_HOST}/fixtures?date=${encodeURIComponent(date)}`;
    } else if (from && to) {
      apiUrl = `https://${APISPORTS_HOST}/fixtures?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    } else {
      return res.status(400).json({ error: "Provide ?date=YYYY-MM-DD OR ?from=YYYY-MM-DD&to=YYYY-MM-DD" });
    }
    if (country) apiUrl += `&country=${encodeURIComponent(country)}`;
    if (league)  apiUrl += `&league=${encodeURIComponent(league)}`;

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
    // Adaptar salida básica a tu frontend
    const items = Array.isArray(json?.response)
      ? json.response.map((it) => ({
          fixtureId: it?.fixture?.id,
          date: it?.fixture?.date?.slice(0,10),
          country: it?.league?.country,
          league: it?.league?.id,
          teams: { home: it?.teams?.home?.name, away: it?.teams?.away?.name }
        }))
      : [];

    return res.json({ count: items.length, items });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
