// src/api/fixtures.js
// Helper FRONTEND: consulta tus serverless y arma gift + parlay.

const API_BASE = ""; // mismo dominio

async function jfetch(path) {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${t}`);
  }
  return res.json();
}

export async function getFixtures({ date, from, to, country }) {
  const qs = new URLSearchParams();
  if (date) qs.set("date", date);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (country) qs.set("country", country);
  const data = await jfetch(`/api/fixtures?${qs.toString()}`);
  return Array.isArray(data?.items) ? data.items : [];
}

export async function getOdds1x2(fixtureId) {
  const data = await jfetch(`/api/odds?fixture=${encodeURIComponent(fixtureId)}&market=1x2`);
  const markets = Array.isArray(data?.markets) ? data.markets : [];
  const m =
    markets.find((mk) => String(mk?.key || "").toLowerCase().includes("1x2")) ||
    markets.find((mk) => String(mk?.market || "").toLowerCase().includes("1x2"));
  if (!m || !Array.isArray(m.outcomes)) return null;

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

function impliedProb(odd) {
  if (!odd || odd <= 1) return 0;
  return 1 / odd;
}

function bestPick1x2(fix, odds) {
  const cands = [];
  if (odds.homeOdd) cands.push({ pick: "Home", odd: odds.homeOdd });
  if (odds.drawOdd) cands.push({ pick: "Draw", odd: odds.drawOdd });
  if (odds.awayOdd) cands.push({ pick: "Away", odd: odds.awayOdd });
  if (!cands.length) return null;

  cands.sort((a, b) => a.odd - b.odd); // favorito = menor cuota
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

export async function getSmartPicks({ date, planTarget, q }) {
  const from = date;
  const toDate = new Date(date);
  toDate.setDate(toDate.getDate() + 2);
  const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(
    toDate.getDate()
  ).padStart(2, "0")}`;

  let country = undefined;
  if (q && /^[a-záéíóúñ]+$/i.test(q.trim())) country = q.trim();

  const fixtures = await getFixtures({ from, to, country });

  const picks = [];
  for (const fx of fixtures) {
    try {
      const o = await getOdds1x2(fx.fixtureId);
      if (!o) continue;
      const p = bestPick1x2(fx, o);
      if (p) picks.push(p);
    } catch {}
  }

  let gift = null;
  const gifts = picks
    .filter((p) => p.odd >= 1.5 && p.odd <= 3 && p.prob >= 0.65)
    .sort((a, b) => b.prob - a.prob);
  if (gifts.length) gift = gifts[0];

  const sorted = [...picks].sort((a, b) => b.prob / b.odd - (a.prob / a.odd));
  const selections = [];
  let totalOdd = 1.0;
  for (const p of sorted) {
    if (selections.length >= 12) break;
    selections.push(p);
    totalOdd *= p.odd;
    if (totalOdd >= (planTarget || 10)) break;
  }

  return {
    gift,
    parlay: {
      target: planTarget || 10,
      totalOdd: Number(totalOdd.toFixed(2)),
      selections,
    },
    meta: {
      totalFixtures: fixtures.length,
      totalWithOdds: picks.length,
    },
  };
}
