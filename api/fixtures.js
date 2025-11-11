// frontend/api/fixtures.js
// Lógica de negocio para traer fixtures + odds y construir picks/parlays.

const API_BASE = ""; // relativo: mismas vercel functions

async function jfetch(path) {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${t}`);
  }
  return res.json();
}

/** Trae fixtures. Soporta:
 * - by date: /api/fixtures?date=YYYY-MM-DD
 * - by range: /api/fixtures?from=YYYY-MM-DD&to=YYYY-MM-DD
 * - country: &country=Chile (opcional)
 * - q: intenta parsear país/liga/equipo muy por encima (lo pasamos como country si parece país)
 */
export async function getFixtures({ date, from, to, country }) {
  const qs = new URLSearchParams();
  if (date) qs.set("date", date);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (country) qs.set("country", country);
  const data = await jfetch(`/api/fixtures?${qs.toString()}`);
  // Esperamos { count, items:[{fixtureId,date,league,country,teams:{home,away}}] }
  return Array.isArray(data?.items) ? data.items : [];
}

/** Odds 1X2 para un fixture. Retorna objeto normalizado:
 * { homeOdd, drawOdd, awayOdd } (números) o null si no hay.
 */
export async function getOdds1x2(fixtureId) {
  const data = await jfetch(`/api/odds?fixture=${encodeURIComponent(fixtureId)}&market=1x2`);
  // API nuestra devuelve {bookmaker, markets: [...]}
  const markets = Array.isArray(data?.markets) ? data.markets : [];
  // Busca mercado 1X2 (case-insensitive)
  const m = markets.find(
    (mk) => typeof mk?.key === "string" && mk.key.toLowerCase().includes("1x2")
  ) || markets.find(
    (mk) => typeof mk?.market === "string" && mk.market.toLowerCase().includes("1x2")
  );

  if (!m || !Array.isArray(m.outcomes)) return null;

  // outcomes puede venir como [{name:"Home",odd:...},{name:"Draw"},{name:"Away"}] (normalizamos)
  let homeOdd, drawOdd, awayOdd;
  for (const o of m.outcomes) {
    const name = String(o?.name || o?.label || "").toLowerCase();
    const val = Number(o?.odd ?? o?.price ?? o?.value);
    if (!isFinite(val) || val <= 1.01) continue;
    if (name.includes("home") || name.includes("1") || name.includes("local")) homeOdd = val;
    else if (name.includes("draw") || name.includes("emp")) drawOdd = val;
    else if (name.includes("away") || name.includes("2") || name.includes("visit")) awayOdd = val;
  }
  if (!homeOdd && !awayOdd) return null;
  return { homeOdd, drawOdd, awayOdd };
}

/** Heurística de probabilidad a partir de cuota (muy simple, sin margen) */
function impliedProb(odd) {
  if (!odd || odd <= 1) return 0;
  return 1 / odd;
}

/** Selecciona “favorito” con mejor probabilidad.
 * Devuelve {match, market:'1X2', pick:'Home|Draw|Away', odd, prob, fixtureId}
 */
function bestPick1x2(fix, odds) {
  const cands = [];
  if (odds.homeOdd) cands.push({ pick: "Home", odd: odds.homeOdd });
  if (odds.drawOdd) cands.push({ pick: "Draw", odd: odds.drawOdd });
  if (odds.awayOdd) cands.push({ pick: "Away", odd: odds.awayOdd });

  if (!cands.length) return null;
  // El favorito es el de menor cuota => mayor prob implícita
  cands.sort((a, b) => a.odd - b.odd);
  const fav = cands[0];
  return {
    match: `${fix?.teams?.home ?? "Home"} vs ${fix?.teams?.away ?? "Away"}`,
    market: "1X2",
    pick: fav.pick,
    odd: fav.odd,
    prob: impliedProb(fav.odd),
    fixtureId: fix?.fixtureId,
    league: fix?.league,
    country: fix?.country,
    date: fix?.date,
  };
}

/** Construye gift y parlay (greedy) con 1X2 reales cuando existan. */
export async function getSmartPicks({ date, planTarget, q }) {
  // Ventana de 3 días para aumentar disponibilidad
  const from = date;
  const toDate = new Date(date);
  toDate.setDate(toDate.getDate() + 2);
  const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(
    toDate.getDate()
  ).padStart(2, "0")}`;

  // Si el query parece país (una palabra con mayúscula), lo pasamos como country
  let country = undefined;
  if (q && /^[a-záéíóúñ]+$/i.test(q.trim())) country = q.trim();

  const fixtures = await getFixtures({ from, to, country });

  // Trae odds para cada fixture (de forma secuencial para ser amable con el rate-limit)
  const picks = [];
  for (const fx of fixtures) {
    try {
      const o = await getOdds1x2(fx.fixtureId);
      if (!o) continue;
      const p = bestPick1x2(fx, o);
      if (p) picks.push(p);
    } catch {
      // ignora fixtures que fallen
    }
  }

  // Gift: buscar selección con odd entre 1.5 y 3 y prob >= 0.65 (aprox 65%+)
  let gift = null;
  const gifts = picks
    .filter((p) => p.odd >= 1.5 && p.odd <= 3 && p.prob >= 0.65)
    .sort((a, b) => b.prob - a.prob);
  if (gifts.length) gift = gifts[0];

  // Parlay greedy: ordena por (prob/odd) para priorizar valor y multiplica hasta objetivo
  const sorted = [...picks].sort((a, b) => (b.prob / b.odd) - (a.prob / a.odd));

  const selections = [];
  let totalOdd = 1.0;
  for (const p of sorted) {
    if (selections.length >= 12) break; // límite sano
    const next = totalOdd * p.odd;
    selections.push(p);
    totalOdd = next;
    if (totalOdd >= (planTarget || 10)) break;
  }

  return {
    gift, // puede ser null
    parlay: {
      target: planTarget || 10,
      totalOdd: Number(totalOdd.toFixed(2)),
      selections,
    },
    // Hooks listos para features premium
    meta: {
      totalFixtures: fixtures.length,
      totalWithOdds: picks.length,
    },
  };
}
