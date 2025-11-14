// api/h2h.js
import { apisGet } from "./_utils/apisports";

/**
 * Soporta:
 *  - ?fixture=ID (preferido)  -> usa /fixtures/headtohead con teams del fixture
 *  - o ?home=Nombre&away=Nombre -> busca equipos y luego obtiene h2h
 */
export default async function handler(req, res) {
  try {
    const { fixture, home, away, timezone = "America/Santiago" } = req.query;

    let team1Id, team2Id;

    if (fixture) {
      const fx = await apisGet("/fixtures", { id: fixture, timezone });
      const r = Array.isArray(fx?.response) ? fx.response[0] : null;
      if (!r) return res.status(404).json({ error: "Fixture no encontrado" });
      team1Id = r?.teams?.home?.id;
      team2Id = r?.teams?.away?.id;
    } else {
      if (!home || !away) return res.status(400).json({ error: "Faltan home y away o fixture" });
      const th = await apisGet("/teams", { search: home });
      const ta = await apisGet("/teams", { search: away });
      team1Id = th?.response?.[0]?.team?.id;
      team2Id = ta?.response?.[0]?.team?.id;
      if (!team1Id || !team2Id) return res.status(404).json({ error: "No se ubicaron IDs de equipos" });
    }

    // Head-to-head
    const h2h = await apisGet("/fixtures/headtohead", { h2h: `${team1Id}-${team2Id}`, last: 5, timezone });
    const list = (h2h?.response || []).map(r => ({
      date: r?.fixture?.date,
      home: r?.teams?.home?.name,
      away: r?.teams?.away?.name,
      goals: `${r?.goals?.home ?? "-"}-${r?.goals?.away ?? "-"}`,
      league: r?.league?.name,
    }));

    res.status(200).json({ count: list.length, matches: list });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
