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
  const s = arr.reduce((a, b) => a + b, 0);
  return s / arr.length;
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

// --- Data quality helpers (form/racha) ---
function extractLast5(pack) {
  return (
    pack?.last5 ||
    pack?.data?.last5 ||
    pack?.stats?.last5 ||
    pack?.form?.last5 ||
    pack?.direct?.last5 ||
    null
  );
}

function hasValidFormStr(s) {
  if (!s || typeof s !== "string") return false;
  // Accept tokens like W-D-L or G-E-P
  const parts = s.split(/\s*[-|\s]\s*/).filter(Boolean);
  if (parts.length < 3) return false;
  return parts.every((t) => {
    const u = String(t).trim().toUpperCase();
    return ["W", "D", "L", "G", "E", "P"].includes(u);
  });
}

function formQuality(pack) {
  const last5 = extractLast5(pack);
  const homeForm = last5?.home?.form || last5?.local?.form || last5?.home?.display || last5?.local?.display || null;
  const awayForm = last5?.away?.form || last5?.visitor?.form || last5?.away?.display || last5?.visitor?.display || null;
  const hasHome = hasValidFormStr(homeForm);
  const hasAway = hasValidFormStr(awayForm);
  return { hasHome, hasAway, full: hasHome && hasAway, homeForm, awayForm };
}

function applyConfidence(p, multiplier) {
  // shrink toward 0.5 to be conservative when data is partial
  const prob = Number(p);
  if (!Number.isFinite(prob)) return prob;
  const m = clamp(Number(multiplier), 0, 1);
  return clamp(0.5 + (prob - 0.5) * m, 0.01, 0.99);
}


function pr(c) {
  const v = Number(c?.__probRank);
  if (Number.isFinite(v)) return v;
  const p = Number(c?.prob);
  return Number.isFinite(p) ? p : 0;
}

function qRank(p) {
  return p?.dataQuality?.isComplete ? 1 : 0;
}


// stats: [{gf, ga}] últimos partidos
function summarizeRecent(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const gf = avg(list.map((x) => safeNum(x.gf) ?? 0));
  const ga = avg(list.map((x) => safeNum(x.ga) ?? 0));
  const total = (gf ?? 0) + (ga ?? 0);
  return { gf: gf ?? 0, ga: ga ?? 0, total };
}

// h2h: [{hg, ag}]
function summarizeH2H(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const totals = list.map((x) => (safeNum(x.hg) ?? 0) + (safeNum(x.ag) ?? 0));
  const btts = list.map((x) =>
    (safeNum(x.hg) ?? 0) > 0 && (safeNum(x.ag) ?? 0) > 0 ? 1 : 0
  );
  return {
    avgTotal: avg(totals) ?? null,
    bttsRate: avg(btts) ?? null,
  };
}

function probUnderFromAvgGoals(avgGoals, line) {
  if (!Number.isFinite(avgGoals)) return null;
  const diff = line - avgGoals; // positivo = favorece Under
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
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

export function probUnderLine(lambdaTotal, line) {
  const maxGoals = 10;
  const thr = Math.floor(Number(line)); // 3.5 -> 3
  let s = 0;
  for (let g = 0; g <= maxGoals; g++) {
    const p = poissonP(g, lambdaTotal);
    if (g <= thr) s += p;
  }
  return clamp(s, 0, 1);
}

export function probBTTSNo(lambdaHome, lambdaAway) {
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
  let pH = 0,
    pD = 0,
    pA = 0;
  for (const c of mat) {
    if (c.hg > c.ag) pH += c.p;
    else if (c.hg === c.ag) pD += c.p;
    else pA += c.p;
  }
  const s = pH + pD + pA;
  if (s > 0) {
    pH /= s;
    pD /= s;
    pA /= s;
  }
  return { home: clamp(pH, 0, 1), draw: clamp(pD, 0, 1), away: clamp(pA, 0, 1) };
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
  // El backend puede enviar llaves en camelCase o PascalCase.
  // Ej: { model: { LambdaHome, LambdaAway, LambdaTotal } }
  const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const pick = (...vals) => {
    for (const v of vals) {
      const n = safeNum(v);
      if (n != null) return n;
    }
    return null;
  };

  const m = pack?.model || pack?.data?.model || pack?.stats?.model || null;

  const lhRaw = pick(m?.lambdaHome, m?.lambda_home, m?.homeLambda, m?.LambdaHome, m?.lambdaH);
  const laRaw = pick(m?.lambdaAway, m?.lambda_away, m?.awayLambda, m?.LambdaAway, m?.lambdaA);
  const ltRaw = pick(m?.lambdaTotal, m?.lambda_total, m?.LambdaTotal, m?.totalLambda);

  // Defaults (conservadores) si no llega modelo
  let lambdaHome = lhRaw != null ? clamp(lhRaw, 0.2, 3.2) : 1.25;
  let lambdaAway = laRaw != null ? clamp(laRaw, 0.2, 3.2) : 1.05;

  // Si llega total pero falta home/away, repartimos.
  if (ltRaw != null && (lhRaw == null || laRaw == null)) {
    const lt = clamp(ltRaw, 0.4, 6.0);
    const wH = lhRaw != null ? clamp(lhRaw / lt, 0.25, 0.75) : 0.55;
    lambdaHome = clamp(lt * wH, 0.2, 3.2);
    lambdaAway = clamp(lt - lambdaHome, 0.2, 3.2);
  }

  const lambdaTotal = clamp(lambdaHome + lambdaAway, 0.4, 6.0);
  return { lambdaHome, lambdaAway, lambdaTotal };
}

export function buildCandidatePicks({ fixture, pack, markets }) {
  
  // Genera picks candidatos con: market, selection, label, prob, fvOdd, marketOdd, usedOdd, valueEdge, fixtureId, home, away
  const out = [];

  // Calidad de datos: usamos la racha (W/D/L últimos 5) como señal principal.
  const q = formQuality(pack);
  const confidence = q.full ? 1 : 0.7; // si falta racha en 1+ equipos, reducimos confianza (sin bloquear)
  const dataQuality = q.full ? "full" : "partial";

  const { lambdaHome, lambdaAway, lambdaTotal } = estimateLambdasFromPack(pack);

  // --- NUEVO: forma + h2h ---
  const recentHome = summarizeRecent(pack?.recent?.home);
  const recentAway = summarizeRecent(pack?.recent?.away);
  const h2h = summarizeH2H(pack?.h2h);

  const recentTotal =
    Number.isFinite(recentHome?.total) && Number.isFinite(recentAway?.total)
      ? (recentHome.total + recentAway.total) / 2
      : null;

  const h2hTotal = Number.isFinite(h2h?.avgTotal) ? h2h.avgTotal : null;

  // Mezcla final de goles esperados (para Under/Over)
  const blendTotal =
    (Number.isFinite(recentTotal) ? 0.45 * recentTotal : 0) +
    (Number.isFinite(h2hTotal) ? 0.35 * h2hTotal : 0) +
    (Number.isFinite(lambdaTotal) ? 0.20 * lambdaTotal : 0);

  const usableTotal = blendTotal > 0.2 ? blendTotal : lambdaTotal;

  // probabilidades base
  const dc = probsDoubleChance(lambdaHome, lambdaAway);

  const under35_h = probUnderFromAvgGoals(usableTotal, 3.5);
  const under25_h = probUnderFromAvgGoals(usableTotal, 2.5);

  // fallback: si heurística da null, usa Poisson
  const under35 = under35_h ?? probUnderLine(lambdaTotal, 3.5);
  const under25 = under25_h ?? probUnderLine(lambdaTotal, 2.5);

  const over25 = clamp(1 - under25, 0.01, 0.99);

  const bttsNo_h = probBTTSNoFromBttsRate(h2h?.bttsRate);
  const bttsNo = bttsNo_h ?? probBTTSNo(lambdaHome, lambdaAway);

  // ---------- picks ----------
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

  // ---------- limpieza + métricas ----------
  const cleaned = out
  .filter((x) => Number.isFinite(x.prob) && pr(x) > 0.01 && pr(x) < 0.999)
  .map((x) => {
    const fvOddNum = Number(x.fvOdd);
    const mkOddNum = Number(x.marketOdd);

    const bestOddRaw = Number.isFinite(mkOddNum) ? mkOddNum : fvOddNum;

    const valueEdgeRaw =
      Number.isFinite(mkOddNum) && Number.isFinite(fvOddNum) && fvOddNum > 0
        ? (mkOddNum / fvOddNum) - 1
        : null;

    return {
      ...x,
      dataQuality,
      confidence,
      __probRank: applyConfidence(Number(x?.prob), confidence),
      fvOdd: round2(fvOddNum),
      marketOdd: Number.isFinite(mkOddNum) ? round2(mkOddNum) : null,
      usedOdd: bestOddRaw,
      usedOddDisplay: round2(bestOddRaw),
      valueEdge: valueEdgeRaw === null ? null : round2(valueEdgeRaw),
      fixtureId: Number(fixture?.fixture?.id || fixture?.id || pack?.fixtureId),
      home: fixture?.teams?.home?.name || pack?.teams?.home?.name || "Home",
      away: fixture?.teams?.away?.name || pack?.teams?.away?.name || "Away",
    };
  });

  // Orden: primero mayor prob (seguro), luego menor odd
  cleaned.sort((a, b) => (qRank(b) - qRank(a)) || (pr(b) - pr(a)) || (Number(a.usedOdd) - Number(b.usedOdd)));
  return cleaned;
}
// =====================
// Helpers de armado FV
// =====================

export function pickSafe(candidatesByFixture) {
  const all = Object.values(candidatesByFixture || {}).flat();
  all.sort((a, b) => (qRank(b) - qRank(a)) || (pr(b) - pr(a)) || (Number(a.usedOdd) - Number(b.usedOdd)));
  return all[0] || null;
}

export function buildGiftPickBundle(candidatesByFixture, minFinalOdd = 1.5, maxFinalOdd = 3.0, maxLegs = 3) {
  // Gift bundle: safe but useful. Prefer COMPLETE data, high prob, modest odds.
  // Signature kept compatible with Comparator.jsx (positional args).

  const pr = (c) => Number.isFinite(c?.prob) ? Number(c.prob) : prob(c);
  const odd = (c) => Number.isFinite(c?.marketOdd) ? Number(c.marketOdd) : null;

  const getSide = (c) => {
    const label = String(c?.label || '').toLowerCase();
    const raw = String(c?.label || '');
    if (!label.includes('doble oportunidad')) return null;
    if (raw.includes('1X') || raw.includes('1x')) return '1X';
    if (raw.includes('X2') || raw.includes('x2')) return 'X2';
    if (raw.includes('12')) return '12';
    return null;
  };

  // Flatten candidates
  const pool = [];
  Object.values(candidatesByFixture || {}).forEach((arr) => (arr || []).forEach((c) => {
    const o = odd(c);
    if (!Number.isFinite(o) || o <= 1) return;
    const p = pr(c);
    if (!Number.isFinite(p) || p < 0.82) return; // safe floor
    pool.push(c);
  }));

  if (!pool.length) return { picks: [], finalOdd: 0 };

  // score: prefer complete data, then prob, then value edge, then modest odds
  const score = (c) => {
    const q = c?.dataQuality === 'complete' ? 1 : (c?.dataQuality === 'partial' ? 0.5 : 0);
    const ve = Number.isFinite(c?.valueEdge) ? Number(c.valueEdge) : 0;
    return (q * 1000) + (pr(c) * 100) + (ve * 100) + (Math.log(odd(c) || 1) * 5);
  };
  pool.sort((a, b) => score(b) - score(a));

  const chosen = [];
  const usedFixtures = new Set();
  const lockedSide = {}; // fixtureId -> '1X'/'X2'/...

  let finalOdd = 1;

  for (const c of pool) {
    if (chosen.length >= maxLegs) break;
    const fx = c?.fixtureId || c?.fixture?.id;
    if (!fx) continue;
    if (usedFixtures.has(fx)) continue;

    const side = getSide(c);
    if (side && lockedSide[fx] && lockedSide[fx] !== side) continue;

    const newOdd = finalOdd * (odd(c) || 1);
    // Stay near the intended gift band
    if (newOdd > maxFinalOdd * 2.0) continue;

    chosen.push(c);
    usedFixtures.add(fx);
    if (side) lockedSide[fx] = side;
    finalOdd = newOdd;

    if (finalOdd >= minFinalOdd && chosen.length >= 2) {
      // already "interesting" enough; optionally stop early if we are within range
      if (finalOdd <= maxFinalOdd) break;
    }
  }

  return {
    picks: chosen.map((c) => ({
      fixtureId: c?.fixtureId || c?.fixture?.id,
      home: c?.home,
      away: c?.away,
      label: c?.label,
      marketOdd: odd(c),
      prob: pr(c),
      dataQuality: c?.dataQuality || 'unknown',
    })),
    finalOdd: round2(finalOdd),
  };
}

export function buildParlay({ candidatesByFixture, target, cap, maxLegs = 12, lockedByFixture = {} }) {
  // Target-aware parlay builder:
  // - Uses ALL candidates (not just the top 1 per fixture) so it can reach x20/x50/x100.
  // - Prevents "side" contradictions (e.g., 1X vs X2) across the same fixture.
  // - Allows up to 2 legs per fixture when needed (and only if compatible).
  // - Falls back gracefully if pool is small.

  const pr = (c) => Number.isFinite(c?.prob) ? Number(c.prob) : prob(c);
  const odd = (c) => Number.isFinite(c?.marketOdd) ? Number(c.marketOdd) : null;

  const TARGETS = [3, 5, 10, 20, 50, 100];
  const t = Number(target);
  const targetNum = TARGETS.includes(t) ? t : 10;

  const minProbByTarget = {
    3: 0.78,
    5: 0.74,
    10: 0.70,
    20: 0.66,
    50: 0.60,
    100: 0.55,
  };
  const minProb = minProbByTarget[targetNum] ?? 0.70;

  const minLegsByTarget = {
    3: 3,
    5: 3,
    10: 5,
    20: 6,
    50: 8,
    100: 10,
  };
  const minLegs = Math.min(maxLegs, minLegsByTarget[targetNum] ?? 5);

  // --- Pick meta / compatibility ---
  const getMeta = (c) => {
    const label = String(c?.label || c?.name || '').toLowerCase();
    const rawLabel = String(c?.label || c?.name || '');
    // SIDE group: avoid conflicting direction for the same fixture
    if (label.includes('doble oportunidad')) {
      let side = null;
      if (rawLabel.includes('1X') || rawLabel.includes('1x')) side = '1X';
      else if (rawLabel.includes('X2') || rawLabel.includes('x2')) side = 'X2';
      else if (rawLabel.includes('12')) side = '12';
      return { group: 'SIDE', key: 'DC', side };
    }
    if (label.includes('gana ') || label.includes('ml ') || label.includes('moneyline')) {
      // crude, but keeps SIDE as a single direction per match
      return { group: 'SIDE', key: 'ML', side: rawLabel };
    }
    if (label.includes('dnb') || label.includes('empate no apuesta')) {
      return { group: 'SIDE', key: 'DNB', side: rawLabel };
    }

    // TOTALS group
    if (label.includes('under') || label.includes('over')) {
      // extract line if present: e.g. "Under 2.5 goals"
      const m = rawLabel.match(/(Under|Over)\s*([0-9]+(\.[0-9]+)?)/i);
      const dir = m ? m[1].toUpperCase() : (label.includes('under') ? 'UNDER' : 'OVER');
      const line = m ? m[2] : '';
      return { group: 'TOTALS', key: `TOTALS_${dir}_${line}`, side: `${dir}_${line}` };
    }

    // BTTS group
    if (label.includes('ambos marcan') || label.includes('btts')) {
      const yes = label.includes('sí') || label.includes('si') || label.includes('yes');
      const no = label.includes('no');
      return { group: 'BTTS', key: 'BTTS', side: yes ? 'YES' : (no ? 'NO' : rawLabel) };
    }

    return { group: 'OTHER', key: rawLabel, side: null };
  };

  const isCompatibleWithinFixture = (a, b) => {
    const ma = getMeta(a);
    const mb = getMeta(b);
    // never allow two SIDE legs on the same fixture
    if (ma.group === 'SIDE' && mb.group === 'SIDE') return false;
    // never allow conflicting DC directions on same fixture
    if (ma.key === 'DC' && mb.key === 'DC' && ma.side && mb.side && ma.side !== mb.side) return false;
    // never allow BOTH BTTS YES and NO
    if (ma.group === 'BTTS' && mb.group === 'BTTS' && ma.side && mb.side && ma.side !== mb.side) return false;
    // never allow BOTH Over and Under on same line family (coarse)
    if (ma.group === 'TOTALS' && mb.group === 'TOTALS') return false;
    return true;
  };

  const violatesLocked = (c) => {
    const fx = c?.fixture?.id;
    const lock = lockedByFixture?.[fx];
    if (!lock) return false;
    const meta = getMeta(c);
    if (lock.side && meta.group === 'SIDE') {
      // lock can be { side:'1X' } or { dc:'1X' }
      const wanted = lock.side || lock.dc;
      if (wanted && meta.side && meta.side !== wanted) return true;
    }
    if (lock.dc && meta.key === 'DC' && meta.side && meta.side !== lock.dc) return true;
    return false;
  };

  // --- Build pool ---
  const all = [];
  Object.values(candidatesByFixture || {}).forEach((arr) => {
    (arr || []).forEach((c) => {
      if (!c) return;
      const o = odd(c);
      if (!Number.isFinite(o) || o <= 1) return;
      if (violatesLocked(c)) return;
      // allow slightly lower prob for high targets, but keep a floor
      const p = pr(c);
      if (!Number.isFinite(p) || p < Math.max(0.50, minProb - 0.10)) return;
      all.push(c);
    });
  });

  // If pool is too small, relax prob floor just a bit (still keep odds valid)
  if (all.length < 6) {
    Object.values(candidatesByFixture || {}).forEach((arr) => {
      (arr || []).forEach((c) => {
        if (!c) return;
        const o = odd(c);
        if (!Number.isFinite(o) || o <= 1) return;
        if (violatesLocked(c)) return;
        const p = pr(c);
        if (!Number.isFinite(p) || p < 0.50) return;
        if (!all.includes(c)) all.push(c);
      });
    });
  }

  // score: prefer higher odds when target is high, but keep prob/valueEdge influential
  const score = (c) => {
    const o = odd(c) ?? 1;
    const p = pr(c) ?? 0;
    const ve = Number.isFinite(c?.valueEdge) ? Number(c.valueEdge) : 0;
    const q = c?.dataQuality === 'complete' ? 1 : (c?.dataQuality === 'partial' ? 0.5 : 0);
    const oddsWeight = targetNum >= 50 ? 2.5 : (targetNum >= 20 ? 1.8 : 1.2);
    return (ve * 100) + (p * 10) + (Math.log(o) * 10 * oddsWeight) + (q * 2);
  };

  all.sort((a, b) => score(b) - score(a));

  // --- Greedy build with per-fixture constraints (max 2 legs per fixture) ---
  const chosen = [];
  const chosenByFixture = {}; // fixtureId -> [cand...]
  let finalOdd = 1;

  const tryAdd = (c) => {
    const fx = c?.fixture?.id;
    if (!fx) return false;
    const per = chosenByFixture[fx] || [];
    if (per.length >= 2) return false;

    // Enforce locked side
    if (violatesLocked(c)) return false;

    // Enforce within-fixture compatibility
    for (const prev of per) {
      if (!isCompatibleWithinFixture(prev, c)) return false;
    }

    // Global "side" consistency within fixture (avoid 1X vs X2)
    const meta = getMeta(c);
    if (meta.group === 'SIDE') {
      const existingSide = per.map(getMeta).find((m) => m.group === 'SIDE');
      if (existingSide && existingSide.side && meta.side && existingSide.side !== meta.side) return false;

      // Also respect lock object if present
      const lock = lockedByFixture?.[fx];
      const wanted = lock?.side || lock?.dc;
      if (wanted && meta.side && meta.side !== wanted) return false;
    }

    // Accept
    chosen.push(c);
    chosenByFixture[fx] = [...per, c];
    finalOdd *= odd(c);
    return true;
  };

  // First pass: keep higher prob for low targets; more odds for high targets
  for (const c of all) {
    if (chosen.length >= maxLegs) break;
    const p = pr(c);
    if (p < minProb) {
      // for low targets, don't dip below minProb in the first pass
      if (targetNum <= 10) continue;
      // for high targets, allow it later only
      continue;
    }
    tryAdd(c);
  }

  // Second pass: if we still don't have enough legs or didn't reach the target, add more candidates (relaxed)
  const needMoreLegs = () => chosen.length < minLegs;
  const needMoreOdd = () => finalOdd < targetNum && chosen.length < maxLegs;

  if (needMoreLegs() || needMoreOdd()) {
    for (const c of all) {
      if (chosen.length >= maxLegs) break;
      if (chosen.includes(c)) continue;
      // allow relaxed prob when target is high
      const p = pr(c);
      if (targetNum >= 50) {
        if (p < 0.55) continue;
      } else if (targetNum >= 20) {
        if (p < 0.60) continue;
      } else {
        if (p < minProb) continue;
      }
      if (tryAdd(c) && !needMoreLegs() && !needMoreOdd()) break;
    }
  }

  // If still no legs, return empty but stable
  if (!chosen.length) {
    return { legs: [], finalOdd: 0, impliedProb: 0, target: targetNum };
  }

  const impliedProb = chosen.reduce((acc, c) => acc * (pr(c) || 0), 1);

  // Cap handling: if we overshoot cap too much, try to drop the lowest score legs
  if (Number.isFinite(cap) && cap > 1 && finalOdd > cap * 1.25 && chosen.length > 1) {
    // Sort chosen ascending by contribution and remove until within cap or minLegs bound
    const withScore = chosen.map((c) => ({ c, s: score(c) }));
    withScore.sort((a, b) => a.s - b.s);
    const keep = [];
    const keepByFixture = {};
    let newOdd = 1;
    for (const item of withScore.reverse()) {
      if (keep.length >= maxLegs) break;
      // tentatively add best legs first
      const c = item.c;
      const fx = c?.fixture?.id;
      const per = keepByFixture[fx] || [];
      if (per.length >= 2) continue;
      let ok = true;
      for (const prev of per) if (!isCompatibleWithinFixture(prev, c)) ok = false;
      if (!ok) continue;
      keep.push(c);
      keepByFixture[fx] = [...per, c];
      newOdd *= odd(c);
      if (Number.isFinite(cap) && newOdd > cap * 1.25 && keep.length > minLegs) {
        // if we got too high, we can stop adding more legs
        break;
      }
    }
    if (keep.length >= 1) {
      chosen.splice(0, chosen.length, ...keep);
      finalOdd = newOdd;
    }
  }

  return {
    legs: chosen.map((c) => ({
      fixtureId: c?.fixture?.id,
      home: c?.home,
      away: c?.away,
      label: c?.label,
      marketOdd: odd(c),
      prob: pr(c),
      dataQuality: c?.dataQuality || 'unknown',
    })),
    finalOdd: round2(finalOdd),
    impliedProb: round2(impliedProb),
    target: targetNum,
  };
}

export function buildValueList(candidatesByFixture, minEdge = 0.06) {
  const all = Object.values(candidatesByFixture || {}).flat();

  const value = all
    .filter((x) => Number.isFinite(Number(x.marketOdd)) && Number.isFinite(Number(x.fvOdd)))
    .map((x) => {
      const mk = Number(x.marketOdd);
      const fv = Number(x.fvOdd);
      const edge = fv > 0 ? (mk / fv) - 1 : null;
      return { ...x, valueEdge: edge === null ? null : round2(edge) };
    })
    .filter((x) => Number.isFinite(x.valueEdge) && x.valueEdge >= minEdge && pr(x) >= 0.80)
    .sort((a, b) => b.valueEdge - a.valueEdge);

  return value.slice(0, 12);
}
