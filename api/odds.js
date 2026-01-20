import express from "express";

const router = express.Router();

const APISPORTS_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const APISPORTS_KEY = process.env.APISPORTS_KEY;

function pickBestBookmaker(bookmakers = [], preferredNames = []) {
  if (!Array.isArray(bookmakers) || bookmakers.length === 0) return null;
  if (preferredNames.length) {
    const hit = bookmakers.find((b) =>
      preferredNames.some((p) => String(b?.name || "").toLowerCase().includes(String(p).toLowerCase()))
    );
    if (hit) return hit;
  }
  // fallback: primero
  return bookmakers[0];
}

function normalizeOddsResponse(apiData) {
  // API-Football odds normalmente viene en data.response[0].bookmakers[...].bets[...].values[...]
  const response = apiData?.response || apiData?.items || [];
  const row = Array.isArray(response) ? response[0] : null;

  const bookmakers = row?.bookmakers || [];
  const book = pickBestBookmaker(bookmakers, [
    // ajusta si quieres preferir una book concreta
    "bet365",
    "pinnacle",
    "1xbet",
    "betano",
    "betsson",
  ]);

  const bets = book?.bets || [];

  // helper: extrae bet por nombre
  const findBet = (nameIncludes) =>
    bets.find((b) => String(b?.name || "").toLowerCase().includes(String(nameIncludes).toLowerCase()));

  const toNum = (x) => {
    const n = Number(String(x).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const mapValues = (bet) => {
    const values = bet?.values || [];
    const out = {};
    for (const v of values) {
      const label = String(v?.value || "").trim();
      const odd = toNum(v?.odd);
      if (label && odd) out[label] = odd;
    }
    return out;
  };

  // MVP markets (nombres típicos API-Football)
  const mw = mapValues(findBet("match winner"));          // Home/Draw/Away
  const dc = mapValues(findBet("double chance"));         // 1X/12/X2
  const ou = mapValues(findBet("goals over/under"));      // Over 2.5, Under 2.5, etc.
  const btts = mapValues(findBet("both teams score"));    // Yes/No
  const cardsOU = mapValues(findBet("cards over/under")); // Over 3.5, Under 3.5 (si existe)
  const cornersOU = mapValues(findBet("corners over/under")); // Over 8.5, Under 8.5 (si existe)

  return {
    found: !!book,
    bookmaker: book ? { id: book.id, name: book.name } : null,
    markets: {
      "1X2": mw,
      "1X": dc,
      "OU": ou,
      "BTTS": btts,
      "CARDS_OU": cardsOU,
      "CORNERS_OU": cornersOU,
    },
  };
}

router.get("/odds", async (req, res) => {
  try {
    const fixture = String(req.query.fixture || "").trim();
    if (!fixture) return res.status(400).json({ error: "fixture is required" });

    if (!APISPORTS_KEY) {
      return res.json({ found: false, markets: {}, note: "APISPORTS_KEY missing" });
    }

    const url = new URL(`https://${APISPORTS_HOST}/odds`);
    url.searchParams.set("fixture", fixture);
    // Opcional: fuerza mercado/fecha/bookmaker si quieres
    // url.searchParams.set("bookmaker", "8"); // ej bet365 (depende IDs del proveedor)

    const r = await fetch(url.toString(), {
      headers: {
        "x-apisports-key": APISPORTS_KEY,
        "x-rapidapi-host": APISPORTS_HOST, // a veces no es necesario, pero no molesta
      },
    });

    if (!r.ok) return res.status(r.status).json({ found: false, markets: {}, http: r.status });

    const data = await r.json();
    const pack = normalizeOddsResponse(data);

    return res.json({
      fixtureId: fixture,
      ...pack,
      fetchedAt: Date.now(),
    });
  } catch (e) {
    return res.status(500).json({ found: false, markets: {}, error: String(e?.message || e) });
  }
});

export default router;
