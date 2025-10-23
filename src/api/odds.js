const afetch = require("./_afetch");

// Devuelve cuotas 1X2 del fixture (primer bookmaker disponible)
module.exports = async (req, res) => {
  try {
    const { fixtureId } = req.query;
    if (!fixtureId) return res.status(400).json({ error: "fixtureId es requerido" });

    const odds = await afetch("/odds", { fixture: fixtureId });
    // odds.response es un array de casas → markets → outcomes
    // buscamos el market "Match Winner" o "1X2" y tomamos 1 / X / 2
    let out = { home: null, draw: null, away: null, bookmaker: "" };

    for (const b of odds) {
      const book = b.bookmakers?.[0];
      if (!book) continue;
      const market = book.bets?.find(m =>
        /match winner|1x2/i.test(m.name || "")
      );
      if (!market) continue;
      out.bookmaker = book.name || "";
      for (const o of market.values || []) {
        const v = Number(o.odd);
        if (/home|1\b/i.test(o.value)) out.home = v;
        if (/draw|x\b/i.test(o.value)) out.draw = v;
        if (/away|2\b/i.test(o.value)) out.away = v;
      }
      if (out.home || out.draw || out.away) break;
    }

    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
