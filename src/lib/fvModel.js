// src/lib/fvModel.js
// FV_MODEL_VERSION: aggressive-targetaware-v6 (2026-02-17)
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

export function buildGiftPickBundle(candidatesByFixture, minOdd = 1.5, maxOdd = 3.0, maxLegs = 3) {
  const pool = Object.values(candidatesByFixture || {})
    .map((list) => (list || [])[0])
    .filter(Boolean)
    .filter((x) => Number.isFinite(x.prob) && pr(x) >= 0.85)
    .filter((x) => {
      const odd = Number(x.usedOdd);
      return Number.isFinite(odd) && odd > 1;
    });

  pool.sort((a, b) => (qRank(b) - qRank(a)) || (pr(b) - pr(a)) || (Number(a.usedOdd) - Number(b.usedOdd)));

  const legs = [];
  let prod = 1;

  for (const cand of pool) {
    if (legs.some((l) => l.fixtureId === cand.fixtureId)) continue;

    const odd = Number(cand.usedOdd);
    if (!Number.isFinite(odd) || odd <= 1) continue;

    const next = prod * odd;
    if (next > maxOdd * 1.03) continue;

    legs.push(cand);
    prod = next;

    if (legs.length >= maxLegs) break;
    if (prod >= minOdd) break;
  }

  if (!legs.length) return null;

  return {
    games: legs.length,
    finalOdd: round2(prod),
    legs,
    reached: prod >= minOdd && prod <= maxOdd * 1.05,
  };
}


export function buildParlay({ candidatesByFixture, target, cap, maxLegs = 12 }) {
  // Target-aware parlay builder (aggressive when needed) with:
  // - anti-contradictions per fixture (DC / O-U / BTTS groups)
  // - optional 2 markets per fixture (compatible only)
  // - dynamic minProb and risk when target is high
  //
  // NOTE: "cap" is treated as soft ceiling; if not provided we allow 1.25x target.
  const T = Number(target) || 5;
  const softCap = Number.isFinite(Number(cap)) ? Number(cap) : T * 1.25;

  // Dynamic thresholds by target (more permissive as target grows)
  const minProbByTarget = (t) => {
    if (t >= 100) return 0.55;
    if (t >= 50) return 0.60;
    if (t >= 20) return 0.66;
    if (t >= 10) return 0.70;
    if (t >= 5) return 0.74;
    return 0.78;
  };
  const minProb = minProbByTarget(T);

  // Legs scaling (try to actually reach the advertised xN)
  const minLegsByTarget = (t) => {
    if (t >= 100) return 10;
    if (t >= 50) return 8;
    if (t >= 20) return 5;
    if (t >= 10) return 4;
    if (t >= 5) return 3;
    return 2;
  };
  const minLegs = minLegsByTarget(T);

  const fixtureIds = Object.keys(candidatesByFixture || {});
  const fixtureCount = fixtureIds.length;

  // Allow more total legs when there are many fixtures (and allow 2 per fixture)
  const dynamicMaxLegs = Math.max(
    minLegs,
    Math.min(
      Math.max(12, maxLegs),
      (T >= 50 ? 18 : (T >= 20 ? 16 : 14)),
      fixtureCount > 0 ? fixtureCount * 2 : maxLegs
    )
  );

  const isFiniteOdd = (x) => Number.isFinite(Number(x)) && Number(x) > 1.01;
  const safeOdd = (c) => {
    if (isFiniteOdd(c?.marketOdd)) return Number(c.marketOdd);
    if (isFiniteOdd(c?.usedOdd)) return Number(c.usedOdd);
    if (isFiniteOdd(c?.fvOdd)) return Number(c.fvOdd);
    return null;
  };
  const safeProb = (c) => {
    const p = Number(c?.prob);
    return Number.isFinite(p) ? p : null;
  };

  const groupKey = (c) => {
    const k = String(c?.key || "");
    if (k.startsWith("DC_")) return "DC";
    if (k.startsWith("OU_")) return "OU";
    if (k.startsWith("BTTS_")) return "BTTS";
    if (k.startsWith("ML_")) return "ML";
    if (k.startsWith("DNB_")) return "DNB";
    return "OTHER";
  };

  const isContradictory = (a, b) => {
    if (!a || !b) return false;
    // Same group contradictions
    const ga = groupKey(a);
    const gb = groupKey(b);
    if (ga !== gb) return false;

    const ka = String(a.key || "");
    const kb = String(b.key || "");

    if (ga === "DC") {
      // DC_1X vs DC_X2 are contradictory; DC_12 vs either is also contradictory
      if (ka === kb) return false;
      const set = new Set([ka, kb]);
      if (set.has("DC_1X") && set.has("DC_X2")) return true;
      if (set.has("DC_12") && (set.has("DC_1X") || set.has("DC_X2"))) return true;
      return false;
    }

    if (ga === "OU") {
      // Only one O/U per fixture; treat any OU_* as conflicting.
      return ka !== kb;
    }

    if (ga === "BTTS") {
      // BTTS_YES vs BTTS_NO
      if (ka === kb) return false;
      const set = new Set([ka, kb]);
      if (set.has("BTTS_YES") && set.has("BTTS_NO")) return true;
      return false;
    }

    if (ga === "ML") {
      return ka !== kb;
    }

    if (ga === "DNB") {
      return ka !== kb;
    }

    return ka !== kb;
  };

  // Primary DC per fixture (prevents "Monaco" vs "PSG" flip across different sections)
  const primaryDCByFixture = {};
  for (const fid of fixtureIds) {
    const list = candidatesByFixture[fid] || [];
    const dcs = list.filter((c) => groupKey(c) === "DC" && safeProb(c) != null && safeOdd(c) != null);
    if (!dcs.length) continue;
    dcs.sort((a, b) => (safeProb(b) - safeProb(a)) || (safeOdd(b) - safeOdd(a)));
    primaryDCByFixture[fid] = dcs[0].key; // lock to best-prob DC for this fixture
  }

  // Build pool with target-aware gating.
  const pool = [];
  for (const fid of fixtureIds) {
    const list = candidatesByFixture[fid] || [];
    for (const c of list) {
      const odd = safeOdd(c);
      const p = safeProb(c);
      if (odd == null || p == null) continue;

      // Basic sanity
      if (odd < 1.05 || odd > 12) continue;

      // Enforce DC lock (only allow primary DC for the fixture)
      if (groupKey(c) === "DC") {
        const lock = primaryDCByFixture[fid];
        if (lock && String(c.key) !== String(lock)) continue;
      }

      // Target-aware probability floor:
      // For x50/x100 allow lower prob, but keep a hard minimum.
      const hardMin = (T >= 100 ? 0.52 : (T >= 50 ? 0.56 : (T >= 20 ? 0.60 : 0.65)));
      if (p < Math.min(minProb, hardMin)) continue;

      // Encourage higher odds when target is high by scoring.
      // Use log(odd) so odds compound naturally; keep prob in score too.
      const edge = Number.isFinite(Number(c.valueEdge)) ? Number(c.valueEdge) : 0;
      const wOdd = (T >= 100 ? 1.25 : (T >= 50 ? 1.15 : (T >= 20 ? 1.05 : 0.90)));
      const wProb = (T >= 100 ? 0.55 : (T >= 50 ? 0.65 : (T >= 20 ? 0.75 : 0.90)));
      const wEdge = (T >= 50 ? 0.40 : 0.25);

      const score = (Math.log(odd) * wOdd) + ((p - 0.5) * wProb) + (edge * wEdge);
      pool.push({ ...c, fixtureId: fid, usedOdd: odd, score });
    }
  }

  // If pool is empty, return empty parlay rather than crashing.
  if (!pool.length) {
    return { target: T, cap: softCap, odds: 1, legs: [] };
  }

  // Sort by score descending.
  pool.sort((a, b) => (b.score - a.score) || (b.usedOdd - a.usedOdd) || (b.prob - a.prob));

  // Greedy build with compatibility constraints and diversification.
  const legs = [];
  const usedByFixture = {}; // fixtureId -> array of legs
  const usedGroupsByFixture = {}; // fixtureId -> Set(group)
  let odds = 1;

  const canAdd = (cand) => {
    const fid = String(cand.fixtureId);
    const g = groupKey(cand);
    const already = usedByFixture[fid] || [];
    const groups = usedGroupsByFixture[fid] || new Set();

    // Allow up to 2 legs per fixture (3 for x100 if needed and pool is big)
    const maxPerFixture = (T >= 100 ? 3 : 2);
    if (already.length >= maxPerFixture) return false;

    // Group uniqueness within fixture for DC/OU/BTTS/ML/DNB (no duplicates)
    if (groups.has(g) && (g === "DC" || g === "OU" || g === "BTTS" || g === "ML" || g === "DNB")) return false;

    // Contradiction check against existing in same fixture
    for (const prev of already) {
      if (isContradictory(prev, cand)) return false;
    }

    // Avoid exploding above cap too early; for high targets, allow overshoot.
    const nextOdds = odds * Number(cand.usedOdd);
    const capTol = (T >= 50 ? softCap * 1.5 : softCap * 1.15);
    if (nextOdds > capTol && odds >= T) return false;

    return true;
  };

  const addLeg = (cand) => {
    const fid = String(cand.fixtureId);
    legs.push(cand);
    odds *= Number(cand.usedOdd);
    (usedByFixture[fid] ||= []).push(cand);
    (usedGroupsByFixture[fid] ||= new Set()).add(groupKey(cand));
  };

  // Pass 1: build towards target with diversification preference.
  for (const cand of pool) {
    if (legs.length >= dynamicMaxLegs) break;
    if (!canAdd(cand)) continue;

    // Prefer new fixtures early to avoid repeating 1-2 matches in everything.
    const fid = String(cand.fixtureId);
    const isNewFixture = !(fid in usedByFixture);

    if (legs.length < minLegs * 2) {
      if (!isNewFixture && Object.keys(usedByFixture).length < Math.min(fixtureCount, minLegs)) continue;
    }

    addLeg(cand);

    if (odds >= T && legs.length >= minLegs) break;
  }

  // Pass 2: if still below target, allow more aggressive additions.
  if (odds < T) {
    for (const cand of pool) {
      if (legs.length >= dynamicMaxLegs) break;
      if (legs.includes(cand)) continue;
      if (!canAdd(cand)) continue;

      addLeg(cand);
      if (odds >= T && legs.length >= minLegs) break;
    }
  }

  // Pass 3: if still below target, try "reach mode" by allowing slightly lower prob but higher odds
  // (still no contradictions).
  if (odds < T) {
    const reachPool = [];
    for (const fid of fixtureIds) {
      const list = candidatesByFixture[fid] || [];
      for (const c of list) {
        const odd = safeOdd(c);
        const p = safeProb(c);
        if (odd == null || p == null) continue;
        if (odd < 1.30 || odd > 20) continue;
        if (groupKey(c) === "DC") {
          const lock = primaryDCByFixture[fid];
          if (lock && String(c.key) !== String(lock)) continue;
        }
        const hardMin = (T >= 100 ? 0.50 : 0.54);
        if (p < hardMin) continue;
        const score = Math.log(odd) * 1.4 + (p - 0.5) * 0.4;
        reachPool.push({ ...c, fixtureId: fid, usedOdd: odd, score });
      }
    }
    reachPool.sort((a, b) => (b.score - a.score) || (b.usedOdd - a.usedOdd));
    for (const cand of reachPool) {
      if (legs.length >= dynamicMaxLegs) break;
      if (!canAdd(cand)) continue;
      addLeg(cand);
      if (odds >= T && legs.length >= minLegs) break;
    }
  }

  // Final polish: sort legs by fixture then by group for stable UI
  legs.sort((a, b) => {
    const fa = String(a.fixtureId);
    const fb = String(b.fixtureId);
    if (fa !== fb) return fa.localeCompare(fb);
    return groupKey(a).localeCompare(groupKey(b));
  });

  return {
    target: T,
    cap: softCap,
    odds: round2(odds),
    legs: legs.map((c) => ({
      fixtureId: c.fixtureId,
      fixture: c.fixture,
      market: c.market,
      key: c.key,
      label: c.label,
      prob: round2(c.prob),
      fvOdd: round2(c.fvOdd),
      marketOdd: round2(c.marketOdd),
      usedOdd: round2(c.usedOdd),
      valueEdge: round2(c.valueEdge),
    })),
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