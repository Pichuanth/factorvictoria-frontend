// frontend/api/odds.js
const afetch = require("./_afetch");

/**
 * GET /api/odds?fixture=12345
 * Devuelve cuotas 1X2 (local / empate / visita) para un partido.
 */
module.exports = async (req, res) => {
  try {
    const fixtureId = req.query.fixture;
    if (!fixtureId) {
      return res.status(400).json({ error: "fixture es requerido" });
    }

    // Llamamos a la API real de odds usando nuestra helper afetch
    const apiResp = await afetch("/odds", { fixture: fixtureId });

    // apiResp.response es un array de casas de apuesta con mercados
    // vamos a intentar normalizarlo a { bookmaker, home, draw, away }
    let out = {
      bookmaker: "",
      home: null,
      draw: null,
      away: null,
    };

    // soportar 2 formatos posibles: {response:[...]} o directamente [...]
    const rawArray = Array.isArray(apiResp?.response)
      ? apiResp.response
      : Array.isArray(apiResp)
      ? apiResp
      : [];

    for (const item of rawArray) {
      const book = item.bookmakers?.[0];
      if (!book) continue;

      // buscamos un market tipo "Match Winner" / "1X2"
      const market = book.bets?.find((m) =>
        /match winner|1x2/i.test(m.name || "")
      );
      if (!market) continue;

      out.bookmaker = book.name || "";

      for (const opt of market.values || []) {
        const oddNum = Number(opt.odd);

        // opt.value puede ser "Home", "Draw", "Away" o "1", "X", "2"
        if (/home|1\b/i.test(opt.value || "")) out.home = oddNum;
        if (/draw|x\b/i.test(opt.value || "")) out.draw = oddNum;
        if (/away|2\b/i.test(opt.value || "")) out.away = oddNum;
      }

      // si ya agarramos cuotas válidas, frenamos
      if (out.home || out.draw || out.away) break;
    }

    return res.status(200).json(out);
  } catch (err) {
    console.error("Error en /api/odds:", err);
    return res.status(500).json({
      error: "No se pudieron obtener cuotas",
      detail: err.message,
    });
  }
};
