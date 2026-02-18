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
  // Expect tokens like W-D-L (any length >= 3 tokens)
  const parts = s.split(/\s*[-|\s]\s*/).filter(Boolean);
  if (parts.length < 3) return false;
  return parts.every((t) => ["W", "D", "L"].includes(String(t).trim().toUpperCase()));
}

function formQuality(pack) {
  const last5 = extractLast5(pack);
  const homeForm = last5?.home?.form || last5?.local?.form || null;
  const awayForm = last5?.away?.form || last5?.visitor?.form || null;
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
  const under15 = probUnderLine(lambdaTotal, 1.5);
  const over15 = 1 - under15;

  const over25 = clamp(1 - under25, 0.01, 0.99);

  const bttsNo_h = probBTTSNoFromBttsRate(h2h?.bttsRate);
  const bttsNo = bttsNo_h ?? probBTTSNo(lambdaHome, lambdaAway);

  // ---------- picks ----------
  // DC: para evitar contradicciones (1X en una sección y X2 en otra),
  // dejamos SOLO la mejor dirección por fixture.
  const dcCand = [
    {
      market: "DC",
      selection: "home_draw",
      label: "Doble oportunidad 1X",
      prob: dc.home_draw,
      fvOdd: fairOddFromProb(dc.home_draw),
      marketOdd: markets?.DC?.home_draw ?? null,
    },
    {
      market: "DC",
      selection: "draw_away",
      label: "Doble oportunidad X2",
      prob: dc.draw_away,
      fvOdd: fairOddFromProb(dc.draw_away),
      marketOdd: markets?.DC?.draw_away ?? null,
    },
  ].filter((p) => Number.isFinite(p.prob) && p.prob > 0);

  if (dcCand.length) {
    const dcScore = (p) => {
      const edge = Number(p.marketOdd) && Number(p.fvOdd) ? (Number(p.marketOdd) / Number(p.fvOdd) - 1) : 0;
      const odd = Number(p.marketOdd) || Number(p.fvOdd) || 99;
      const oddPenalty = odd >= 3 ? 0.02 : odd >= 2.2 ? 0.01 : 0;
      return (p.prob + Math.max(0, edge) * 0.05 - oddPenalty);
    };

    dcCand.sort((a, b) => dcScore(b) - dcScore(a));
    out.push(dcCand[0]);
  }

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

  // Over 1.5 goles (más conservador, útil para ajustar cuotas con muchos partidos)
  out.push({
    type: "OU_15",
    selection: "over",
    label: "Over 1.5 goles",
    prob: over15,
    fvOdd: fairOddFromProb(over15),
    marketOdd: markets?.OU_15?.over ?? markets?.OU_15?.o ?? null,
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
  cleaned.sort((a, b) => (pr(b) - pr(a)) || (Number(a.usedOdd) - Number(b.usedOdd)));
  return cleaned;
}
// =====================
// Helpers de armado FV
// =====================

export function pickSafe(candidatesByFixture) {
  const all = Object.values(candidatesByFixture || {}).flat();

  // Prefer fixtures with full stats (círculo verde), then probability, then lower odd.
  const scoreSafe = (p) => {
    const fullBoost = p?.dataQuality === "full" ? 0.02 : 0;
    return (pr(p) + fullBoost);
  };

  all.sort((a, b) => (scoreSafe(b) - scoreSafe(a)) || (Number(a.usedOdd) - Number(b.usedOdd)));
  return all[0] || null;
}

// --- Module-scoped memory (self-contained patch) ---
// Used to:
// 1) Prevent contradictions between "Cuota segura (regalo)" and generated parlays.
// 2) Differentiate x50 vs x100 when the pool is small.
let __fv_lastGiftLegs = null;
let __fv_lastParlay50 = null;

function __fv_normSel(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function __fv_dcKind(p) {
  if (!p || p.market !== "DC") return null;
  const sel = __fv_normSel(p.selection);
  if (sel === "1x" || sel === "x1" || sel.includes("homedraw") || sel.includes("home_draw")) return "HOME_DRAW";
  if (sel === "x2" || sel === "2x" || sel.includes("drawaway") || sel.includes("draw_away") || sel.includes("awaydraw")) return "DRAW_AWAY";
  if (sel === "12" || sel.includes("homeaway") || sel.includes("home_away")) return "HOME_AWAY";
  return null;
}

function __fv_preferredDCKind(picks) {
  const best = { HOME_DRAW: null, DRAW_AWAY: null, HOME_AWAY: null };
  for (const p of picks || []) {
    const k = __fv_dcKind(p);
    if (!k) continue;
    const score = pr(p) * (1 + (Number(p.valueEdge) || 0)) * (1 + (p.dataQuality === "full" ? 0.03 : 0));
    if (!best[k] || score > best[k].score) best[k] = { score, p };
  }
  const entries = Object.entries(best).filter(([, v]) => v);
  if (entries.length <= 1) return null;
  entries.sort((a, b) => b[1].score - a[1].score);
  const top = entries[0];
  const second = entries[1];
  if (top[1].score >= second[1].score * 1.01) return top[0];
  return null;
}

function __fv_isContradictoryPick(a, b) {
  if (!a || !b) return false;
  if (String(a.fixtureId) !== String(b.fixtureId)) return false;

  const aDCKind = __fv_dcKind(a);
  const bDCKind = __fv_dcKind(b);
  if (aDCKind && bDCKind && aDCKind !== bDCKind) return true;

  if (a.market === "ML" && b.market === "ML" && a.selection !== b.selection) return true;

  if (a.market === "OU" && b.market === "OU") {
    if (String(a.line) === String(b.line) && a.selection !== b.selection) return true;
  }

  if (a.market === "BTTS" && b.market === "BTTS" && a.selection !== b.selection) return true;

  return false;
}

function __fv_sameLegSet(aLegs, bLegs) {
  if (!Array.isArray(aLegs) || !Array.isArray(bLegs)) return false;
  if (aLegs.length !== bLegs.length) return false;
  const key = (x) => `${String(x.fixtureId)}|${x.market}|${x.selection}`;
  const a = aLegs.map(key).sort();
  const b = bLegs.map(key).sort();
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function buildGiftPickBundle(candidatesByFixture, minOdd = 1.5, maxOdd = 3.0, maxLegs = 3) {
  const hasAnyFull = Object.values(candidatesByFixture || {}).some((list) => {
    const arr = Array.isArray(list) ? list : [];
    return arr.some((c) => c && c.dataQuality === "full");
  });

  const pool = Object.values(candidatesByFixture || {})
    .map((list) => {
      const arr = Array.isArray(list) ? list : [];
      if (hasAnyFull && !arr.some((c) => c && c.dataQuality === "full")) return null;
      // Prioriza "full" (círculo verde) si existe.
      const full = arr.filter((p) => p?.dataQuality === "full");
      return (full.length ? full : arr)[0] || null;
    })
    .filter(Boolean)
    .filter((x) => Number.isFinite(x.prob) && pr(x) >= 0.85)
    .filter((x) => {
      const odd = Number(x.usedOdd);
      return Number.isFinite(odd) && odd > 1;
    });


  const maxLegsEff = Math.max(1, Math.min((Number(maxLegs) || 5), pool.length || (Number(maxLegs) || 5)));
  pool.sort((a, b) => (pr(b) - pr(a)) || (Number(a.usedOdd) - Number(b.usedOdd)));

  const legs = [];
  let prod = 1;

  for (const cand of pool) {
    if (legs.some((l) => String(l.fixtureId) === String(cand.fixtureId))) continue;

    const odd = Number(cand.usedOdd);
    if (!Number.isFinite(odd) || odd <= 1) continue;

    const next = prod * odd;
    if (next > maxOdd * 1.03) continue;

    legs.push(cand);
    prod = next;

    if (legs.length >= maxLegsEff) break;
    if (prod >= minOdd) break;
  }

  if (!legs.length) return null;

  // Guardar el regalo para evitar contradicciones con parlays.
  __fv_lastGiftLegs = legs.slice();

  return {
    games: legs.length,
    finalOdd: round2(prod),
    legs,
    reached: prod >= minOdd && prod <= maxOdd * 1.05,
  };
}


function __fv_legOdd(c) {
  const o = Number(c?.usedOdd);
  if (Number.isFinite(o) && o > 1) return o;
  const m = Number(c?.marketOdd);
  if (Number.isFinite(m) && m > 1) return m;
  const f = Number(c?.fvOdd);
  if (Number.isFinite(f) && f > 1) return f;
  return 99;
}

function __fv_legScore(c, oddWeight = 0.35) {
  // Ranking: prioritize probability and (lightly) higher odds for high targets.
  const p = pr(c);
  const odd = __fv_legOdd(c);
  const edge = Number(c?.valueEdge);
  const e = Number.isFinite(edge) ? edge : 0;
  const oddTerm = odd > 1 ? Math.log(odd) : 0;
  return p + Math.max(0, e) * 0.06 + oddWeight * oddTerm;
}


export function buildParlay(candidatesByFixture, target, opts = {}) {
  const t = Number(target);
  const candAll = Object.values(candidatesByFixture || {}).flat();

  // helpers local to avoid undefineds in future edits
  const safeNum = (x, d=0) => (typeof x === "number" && Number.isFinite(x) ? x : d);

  // Pool size should represent *available matches*, not raw candidate count.
  // Using match-count makes the leg-scaling behave correctly when each match has multiple candidate markets.
  const poolMatches = (() => {
    const keys = Object.keys(candidatesByFixture || {});
    if (keys.length) return keys.length;
    const s = new Set();
    for (const c of candAll) {
      const id = c?.fixtureId ?? c?.fixture?.id ?? c?.fixture_id;
      if (id != null) s.add(String(id));
    }
    return s.size;
  })();

  // ---------- Dynamic legs range (pool-aware, more aggressive on big pools) ----------
  // Goal: with many matches available, use MORE legs with LOWER odds (more conservative & realistic).
  // (User intent examples)
  // - ~10 matches: 6–8 legs max
  // - 30–40 matches: x20 8–10, x50 10–12, x100 12–15
  const baseRange =
    // Baseline: prevent x100 from defaulting to too many legs on small pools;
    // upscale is handled by poolMatches rules below.
    t >= 100 ? { min: 6, max: 10 } :
    t >= 50  ? { min: 5, max: 9 } :
    t >= 20  ? { min: 4, max: 8 } :
               { min: 2, max: 6 };

  let minLegs = baseRange.min;
  let maxLegs = baseRange.max;

  if (poolMatches >= 30) {
    if (t >= 100) { minLegs = 12; maxLegs = 15; }
    else if (t >= 50) { minLegs = 10; maxLegs = 12; }
    else if (t >= 20) { minLegs = 8;  maxLegs = 10; }
    else { minLegs = Math.max(minLegs, 6); maxLegs = Math.max(maxLegs, 9); }
  } else if (poolMatches >= 20) {
    // 20–29 matches: upscale legs notably (more conservative odds per leg).
    if (t >= 100) { minLegs = 12; maxLegs = 15; }
    else if (t >= 50) { minLegs = 10; maxLegs = 12; }
    else if (t >= 20) { minLegs = 8;  maxLegs = 10; }
    else { minLegs = Math.max(minLegs, 6); maxLegs = Math.max(maxLegs, 9); }
  } else if (poolMatches >= 10) {
    // ~10–19 matches: we have enough variety to build longer parlays with LOWER odds per leg.
    // User target: if ~10 matches, x100 should prefer ~7–8 legs (not 2–5 legs with huge odds).
    if (t >= 100) { minLegs = 7; maxLegs = 9; }
    else if (t >= 50) { minLegs = 7; maxLegs = 8; }
    else if (t >= 20) { minLegs = 6; maxLegs = 8; }
    else { minLegs = Math.max(minLegs, 4); maxLegs = Math.min(maxLegs, 8); }
  } else {
    // small pool: allow fewer legs so it doesn't fail
    minLegs = Math.max(2, minLegs - 1);
  }

  minLegs = clamp(minLegs, 2, 15);
  maxLegs = clamp(maxLegs, minLegs, 15);

  // ---------- Odds cap per leg (tighter on big pools to force conservative legs) ----------
  // With more matches available, we can cap odds harder and still reach targets by adding legs.
  const capLegOddBase = (() => {
    // Hard rule: never exceed 3.50 (user requirement).
    // On bigger pools (and higher targets), cap lower so the model prefers adding legs instead of taking huge odds.
    if (t >= 100) {
      return poolMatches >= 30 ? 2.20 :
             poolMatches >= 20 ? 2.35 :
             poolMatches >= 10 ? 2.60 :
             3.10;
    }
    if (t >= 50) {
      return poolMatches >= 30 ? 2.40 :
             poolMatches >= 20 ? 2.60 :
             poolMatches >= 10 ? 2.85 :
             3.20;
    }
    if (t >= 20) {
      return poolMatches >= 30 ? 2.70 :
             poolMatches >= 20 ? 2.85 :
             poolMatches >= 10 ? 3.10 :
             3.35;
    }
    return 3.50;
  })();
  const capLegOdd = clamp(safeNum(opts.capLegOdd, capLegOddBase), 1.10, 3.50);

  // ---------- Target range (avoid x50 exploding to x90) ----------
  const targetMinBase = safeNum(opts.targetMinMul, 0.92);
  const targetMaxMul =
    t >= 100 ? 1.60 :
    t >= 50  ? 1.35 :
    t >= 20  ? 1.35 : 2.00;

  let minFactor = t * targetMinBase;
  let maxFactor = t * targetMaxMul;

  // Monotonic guarantee: x100 should be strictly above last x50
  // (stored in global for simplicity; survives across calls)
  if (t >= 100 && typeof window !== "undefined") {
    const last50 = safeNum(window.__fv_lastParlay50, 0);
    if (last50 > 0) {
      minFactor = Math.max(minFactor, last50 * 1.10); // at least +10%
    }
  }

  // ---------- Scoring / ordering ----------
  const probFloorBase =
    t >= 100 ? 0.54 :
    t >= 50  ? 0.56 :
    t >= 20  ? 0.58 : 0.60;

  const probFloor = safeNum(opts.probFloor, probFloorBase);

  const isSafeFiller = (c) => {
    // Prefer Over 1.5 / Under 3.5 as "relleno seguro" when we need more legs.
    const market = String(c?.market || c?.type || "").toUpperCase();
    const label = String(c?.label || "").toLowerCase();
    const sel = String(c?.selection || "").toLowerCase();
    const line = Number(c?.line);
    const over15 = (market === "OU" || label.includes("over")) && (line === 1.5 || label.includes("over 1.5") || (sel.includes("over") && sel.includes("1.5")));
    const under35 = (market === "OU" || label.includes("under")) && (line === 3.5 || label.includes("under 3.5") || (sel.includes("under") && sel.includes("3.5")));
    return over15 || under35;
  };

  const scored = candAll
    .filter(c => safeNum(c.prob, 0) >= probFloor && safeNum(c.odd, 0) >= 1.05)
    .map(c => {
      const odd = safeNum(c.odd, 1.0);
      const prob = safeNum(c.prob, 0);
      const edge = safeNum(c.edge, 0);

      // Prefer higher prob + positive edge + LOWER odds.
      // When pool is large, penalize high odds more aggressively and slightly boost safe fillers.
      const oddPenalty = poolMatches >= 20 ? 0.35 : 0.25;
      const fillerBonus = (poolMatches >= 20 && isSafeFiller(c)) ? 0.06 : 0;
      const score = (prob * 1.2) + (edge * 0.8) - (Math.log(odd) * oddPenalty) + fillerBonus;

      // Safety: ensure names are never empty (prevents "— vs" in UI)
      const home = (c.home && String(c.home).trim()) || (c.fixture?.teams?.home?.name) || "Local";
      const away = (c.away && String(c.away).trim()) || (c.fixture?.teams?.away?.name) || "Visita";

      return { ...c, home, away, __score: score };
    })
    .sort((a, b) => b.__score - a.__score);

  // Avoid contradictions: only one pick per fixture
  const usedFixture = new Set();

  function greedyBuild({ relax = false } = {}) {
    const legs = [];
    let prod = 1;

    const maxLegOddEff = relax ? clamp(capLegOdd + 0.15, 1.10, 3.50) : capLegOdd;
    const maxFactorEff = relax ? maxFactor * 1.25 : maxFactor;
    const minFactorEff = relax ? minFactor * 0.95 : minFactor;

    for (const c of scored) {
      const fixtureId = c.fixtureId ?? c.fixture?.id ?? c.fixture_id;
      if (fixtureId == null) continue;
      if (usedFixture.has(fixtureId)) continue;

      const odd = safeNum(c.odd, 1.0);
      if (odd > maxLegOddEff) continue;

      // If we're already close to target, avoid huge overshoot (keep x50 ~ x50)
      const projected = prod * odd;
      const close = prod >= (t * 0.70);
      if (!relax && close && projected > maxFactorEff) {
        continue;
      }

      legs.push(c);
      usedFixture.add(fixtureId);
      prod = projected;

      // Break if we achieved a good range and enough legs
      if (legs.length >= minLegs && prod >= minFactorEff) {
        // If we are inside maxFactorEff, stop. Otherwise keep trying to add smaller odds legs.
        if (prod <= maxFactorEff) break;
      }
      if (legs.length >= maxLegs) break;
    }

    // If still below minFactor and we have room, try to add more even if it overshoots a bit.
    if (prod < minFactorEff && legs.length < maxLegs) {
      for (const c of scored) {
        const fixtureId = c.fixtureId ?? c.fixture?.id ?? c.fixture_id;
        if (fixtureId == null || usedFixture.has(fixtureId)) continue;
        const odd = safeNum(c.odd, 1.0);
        if (odd > maxLegOddEff) continue;

        legs.push(c);
        usedFixture.add(fixtureId);
        prod *= odd;
        if (legs.length >= maxLegs) break;
        if (legs.length >= minLegs && prod >= minFactorEff) break;
      }
    }

    // Basic validity
    if (legs.length < Math.min(minLegs, maxLegs)) return null;
    return { legs, prod };
  }

  // First pass: conservative (high prob, low odds)
  let built = greedyBuild({ relax: false });

  // Second pass: relax a bit if we failed to reach x100 minFactor
  if (!built && t >= 50) {
    usedFixture.clear();
    built = greedyBuild({ relax: true });
  }

  if (!built) return null;

  const finalOdd = built.prod;
  const picks = built.legs.map(l => ({
    fixtureId: l.fixtureId ?? l.fixture?.id ?? l.fixture_id,
    type: l.type,
    label: l.label,
    odd: safeNum(l.odd, 1.0),
    prob: safeNum(l.prob, null),
    edge: safeNum(l.edge, null),
    home: l.home,
    away: l.away,
  }));

  const out = {
    target: t,
    finalOdd,
    legs: picks,
    legsCount: picks.length,
    // keep UI compatibility:
    final: `x${round2(finalOdd)}`,
  };

  // Persist last x50 for monotonic x100
  if (typeof window !== "undefined" && t >= 50 && t < 100) {
    window.__fv_lastParlay50 = finalOdd;
  }

  // Also persist in module-scope memory (used by other helpers / future sessions)
  if (t >= 50 && t < 100) {
    __fv_lastParlay50 = finalOdd;
  }

  return out;
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
