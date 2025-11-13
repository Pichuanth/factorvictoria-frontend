// frontend/api/h2h.js
export default async function handler(req, res) {
  try {
    const host = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
    const key = process.env.APISPORTS_KEY || process.env.VITE_APIFOOTBALL_KEY || "";
    const { home, away, limit = 5 } = req.query || {};

    if (!key) return res.status(400).json({ error: "Missing APISPORTS_KEY" });
    if (!home || !away) return res.status(400).json({ error: "Missing home/away ids" });

    const url = `https://${host}/fixtures/headtohead?h2h=${home}-${away}&last=${limit}`;
    const r = await fetch(url, {
      headers: {
        "x-apisports-key": key,
      },
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: "upstream", body: text });
    }
    const j = await r.json();

    // Normaliza a { items: [{ date, score } ...] }
    const items = Array.isArray(j?.response)
      ? j.response.map((m) => ({
          date: m.fixture?.date?.slice(0, 10),
          score:
            `${m.goals?.home ?? m.score?.fulltime?.home ?? 0}` +
            "-" +
            `${m.goals?.away ?? m.score?.fulltime?.away ?? 0}`,
        }))
      : [];

    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
