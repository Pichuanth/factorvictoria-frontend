// src/lib/fvModel.js
// Motor MVP de probabilidades + armado de parlays para Factor Victoria.
// Objetivo: simple, interpretable, con fallbacks (si no hay odds o stats).

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function round2(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Number(x.toFixed(2)) : null;
}

function avg(arr) {
  if (!arr?.length) return null;
  const s = arr.reduce((a,b)=>a+b,0);
  return s / arr.length;
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

// stats: [{gf, ga}] últimos partidos
function summarizeRecent(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const gf = avg(list.map(x => safeNum(x.gf) ?? 0));
  const ga = avg(list.map(x => safeNum(x.ga) ?? 0));
  const total = (gf ?? 0) + (ga ?? 0);
  return { gf: gf ?? 0, ga: ga ?? 0, total };
}

// h2h: [{hg, ag}]
function summarizeH2H(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const totals = list.map(x => (safeNum(x.hg) ?? 0) + (safeNum(x.ag) ?? 0));
  const btts = list.map(x => ((safeNum(x.hg) ?? 0) > 0 && (safeNum(x.ag) ?? 0) > 0) ? 1 : 0);
  return {
    avgTotal: avg(totals) ?? null,
    bttsRate: avg(btts) ?? null,
  };
}
function probUnderFromAvgGoals(avgGoals, line) {
  // Heurística suave: si avgGoals << line, prob alta
  if (!Number.isFinite(avgGoals)) return null;
  const diff = line - avgGoals; // positivo = favorece Under
  // mapa simple con sigmoide
  const p = 1 / (1 + Math.exp(-1.4 * diff));
  return clamp(p, 0.05, 0.95);
}

function probBTTSNoFromBttsRate(bttsRate) {
  if (!Number.isFinite(bttsRate)) return null;
  return clamp(1 - bttsRate, 0.05, 0.95);
}

export function fairOddFromProb(p) {
  const pp = clamp(Number(p || 0), 1e-6, 0.999999);
  return 1 / pp;
}

function factorial(n) {
  let x = 1;
  for (let i = 2; i <= n; i++) x *= i;
  return x;
}

function poissonP(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

export function probUnderLine(lambdaTotal, line) {
  // Under line: P(G <= floor(line)) si line es entero; para 3.5, floor=3
  const maxGoals = 10;
  const thr = Math.floor(Number(line));
  let s = 0;
  for (let g = 0; g <= maxGoals; g++) {
    const p = poissonP(g, lambdaTotal);
    if (g <= thr) s += p;
  }
  return clamp(s, 0, 1);
}

export function probBTTSNo(lambdaHome, lambdaAway) {
  // P(home=0 OR away=0) = P(home=0) + P(away=0) - P(both=0)
  const pH0 = poissonP(0, lambdaHome);
  const pA0 = poissonP(0, lambdaAway);
  const pBoth0 = pH0 * pA0;
  return clamp(pH0 + pA0 - pBoth0, 0, 1);
}

export function scoreMatrix(lambdaHome, lambdaAway, maxG = 6) {
  const mat = [];
  for (let i = 0; i <= maxG; i++) {
    for (let j = 0; j <= maxG; j++) {
      mat.push({ hg: i, ag: j, p: poissonP(i, lambdaHome) * poissonP(j, lambdaAway) });
    }
  }
  return mat;
}

export function probs1X2(lambdaHome, lambdaAway) {
  const mat = scoreMatrix(lambdaHome, lambdaAway, 6);
  let pH = 0, pD = 0, pA = 0;
  for (const c of mat) {
    if (c.hg > c.ag) pH += c.p;
    else if (c.hg === c.ag) pD += c.p;
    else pA += c.p;
  }
  // cola (7+ goles) ignorada: re-normaliza un poco
  const s = pH + pD + pA;
  if (s > 0) {
    pH /= s; pD /= s; pA /= s;
  }
  return { home: clamp(pH,0,1), draw: clamp(pD,0,1), away: clamp(pA,0,1) };
}

export function probsDoubleChance(lambdaHome, lambdaAway) {
  const p = probs1X2(lambdaHome, lambdaAway);
  return {
    home_draw: clamp(p.home + p.draw, 0, 1),
    home_away: clamp(p.home + p.away, 0, 1),
    draw_away: clamp(p.draw + p.away, 0, 1),
  };
}

export function estimateLambdasFromPack(pack) {
  // pack.model viene del backend; si no existe, fallback con valores neutros
  const lh = Number(pack?.model?.lambdaHome);
  const la = Number(pack?.model?.lambdaAway);

  const lambdaHome = Number.isFinite(lh) ? clamp(lh, 0.2, 3.2) : 1.25;
  const lambdaAway = Number.isFinite(la) ? clamp(la, 0.2, 3.2) : 1.05;

  return { lambdaHome, lambdaAway, lambdaTotal: lambdaHome + lambdaAway };
}

export function buildCandidatePicks({ fixture, pack, markets }) {
  // 1) modelo base (Poisson)
  const { lambdaHome, lambdaAway, lambdaTotal } = estimateLambdasFromPack(pack);

  // 2) forma + h2h (heurística)
  const recentHome = summarizeRecent(pack?.recent?.home);
  const recentAway = summarizeRecent(pack?.recent?.away);
  const h2h = summarizeH2H(pack?.h2h);

  const recentTotal =
    Number.isFinite(recentHome?.total) && Number.isFinite(recentAway?.total)
      ? (recentHome.total + recentAway.total) / 2
      : null;

  const h2hTotal = Number.isFinite(h2h?.avgTotal) ? h2h.avgTotal : null;

  const blendTotal =
    (Number.isFinite(recentTotal) ? 0.45 * recentTotal : 0) +
    (Number.isFinite(h2hTotal) ? 0.35 * h2hTotal : 0) +
    (Number.isFinite(lambdaTotal) ? 0.20 * lambdaTotal : 0);

  const usableTotal = blendTotal > 0.2 ? blendTotal : lambdaTotal;

  // 3) probabilidades
  const dc = probsDoubleChance(lambdaHome, lambdaAway);

  const under35_h = probUnderFromAvgGoals(usableTotal, 3.5);
  const under25_h = probUnderFromAvgGoals(usableTotal, 2.5);
  const bttsNo_h = probBTTSNoFromBttsRate(h2h?.bttsRate);

  const under35 = under35_h ?? probUnderLine(lambdaTotal, 3.5);
  const under25 = under25_h ?? probUnderLine(lambdaTotal, 2.5);
  const over25 = clamp(1 - under25, 0.01, 0.99);

  const bttsNo = bttsNo_h ?? probBTTSNo(lambdaHome, lambdaAway);

  // 4) construir lista de picks
  const out = [];

  out.push({
    market: "DC",
    selection: "home_draw",
    label: "Doble oportunidad 1X",
    prob: dc.home_draw,
    fvOdd: fairOddFromProb(dc.home_draw),
    marketOdd: markets?.DC?.home_draw ?? null,
  });

  out.push({
    market: "DC",
    selection: "draw_away",
    label: "Doble oportunidad X2",
    prob: dc.draw_away,
    fvOdd: fairOddFromProb(dc.draw_away),
    marketOdd: markets?.DC?.draw_away ?? null,
  });

  out.push({
    market: "OU_35",
    selection: "under",
    label: "Under 3.5 goles",
    prob: under35,
    fvOdd: fairOddFromProb(under35),
    marketOdd: markets?.OU_35?.under ?? null,
  });

  out.push({
    market: "OU_25",
    selection: "under",
    label: "Under 2.5 goles",
    prob: under25,
    fvOdd: fairOddFromProb(under25),
    marketOdd: markets?.OU_25?.under ?? null,
  });

  out.push({
    market: "OU_25",
    selection: "over",
    label: "Over 2.5 goles",
    prob: over25,
    fvOdd: fairOddFromProb(over25),
    marketOdd: markets?.OU_25?.over ?? null,
  });

  out.push({
    market: "BTTS",
    selection: "no",
    label: "Ambos marcan: NO",
    prob: bttsNo,
    fvOdd: fairOddFromProb(bttsNo),
    marketOdd: markets?.BTTS?.no ?? null,
  });

  // 5) limpiar + enriquecer
  const cleaned = out
    .filter((x) => Number.isFinite(x.prob) && x.prob > 0.01 && x.prob < 0.999)
    .map((x) => {
      const bestOdd = Number.isFinite(Number(x.marketOdd)) ? Number(x.marketOdd) : Number(x.fvOdd);
      const valueEdge = Number.isFinite(Number(x.marketOdd))
        ? Number(x.marketOdd) / Number(x.fvOdd) - 1
        : null;

      return {
        ...x,
        fvOdd: round2(x.fvOdd),
        marketOdd: x.marketOdd ? round2(x.marketOdd) : null,
        usedOdd: round2(bestOdd),
        valueEdge: valueEdge === null ? null : round2(valueEdge),
        fixtureId: Number(fixture?.fixture?.id || fixture?.id || pack?.fixtureId),
        home: fixture?.teams?.home?.name || pack?.teams?.home?.name || "Home",
        away: fixture?.teams?.away?.name || pack?.teams?.away?.name || "Away",
      };
    });

  cleaned.sort((a, b) => (b.prob - a.prob) || (a.usedOdd - b.usedOdd));
  return cleaned;
}

export function pickSafe(candidatesByFixture) {
  const all = Object.values(candidatesByFixture || {}).flat();
  all.sort((a, b) => (b.prob - a.prob) || (a.usedOdd - b.usedOdd));
  return all[0] || null;
}

export function buildParlay({ candidatesByFixture, target, cap, maxLegs = 12 }) {
  const fixtures = Object.keys(candidatesByFixture || {});
  const pool = fixtures
    .map((fid) => {
      const list = candidatesByFixture[fid] || [];
      return list[0] ? { fid, best: list[0], list } : null;
    })
    .filter(Boolean);

  // Ordena por prob desc (más seguros primero)
  pool.sort((a, b) => (b.best.prob - a.best.prob));

  let legs = [];
  let prod = 1;

  for (const item of pool) {
    const cand = item.best;
    const next = prod * cand.usedOdd;

    // si ya estamos cerca del objetivo, intentamos no pasarnos del cap
    if (next > cap * 1.01) continue;
    legs.push(cand);
    prod = next;

    if (legs.length >= maxLegs) break;
    if (prod >= target * 0.95) break;
  }

  if (legs.length < 2) return null;

  const finalOdd = round2(prod);
  const impliedProb = round2(1 / prod);

  return {
    target,
    cap,
    games: legs.length,
    finalOdd,
    impliedProb,
    legs,
    reached: finalOdd >= target * 0.90,
  };
}

export function buildValueList(candidatesByFixture, minEdge = 0.06) {
  const all = Object.values(candidatesByFixture || {}).flat();
  const value = all
    .filter(x => x.marketOdd && Number.isFinite(x.valueEdge) && x.valueEdge >= minEdge && x.prob >= 0.80)
    .sort((a, b) => (b.valueEdge - a.valueEdge));
  return value.slice(0, 12);
}
