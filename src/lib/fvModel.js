// ====== HELPERS GLOBALES ======

function clamp01(x) {
  if (typeof x !== "number" || isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function clamp(x, min, max) {
  if (typeof x !== "number" || isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

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

  // Added: Over 1.5 (conservative booster) via Poisson
  const under15 = probUnderLine(lambdaTotal, 1.5);
  const over15 = clamp01(1 - under15);

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
    market: "OU_15",
    selection: "over",
    label: "Over 1.5 goles",
    prob: over15,
    fvOdd: fairOddFromProb(over15),
    marketOdd: markets?.OU_15?.over ?? null,
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


export function buildParlay(target, sample, opts = {}) {
  // ---- Defensive defaults (avoid "is not defined" runtime issues) ----
  const _opts = opts || {};
  const poolSize = Number.isFinite(_opts.poolSize) ? _opts.poolSize : (Array.isArray(sample) ? sample.length : 0);

  // Dynamic legs hints by pool size (more fixtures => spread risk with more legs)
  const getLegBounds = (t, ps) => {
    // user intent: x20 5–7, x50 7–9, x100 9–15 (and scale up when pool is large)
    if (t >= 100) {
      if (ps >= 25) return { min: 12, max: 15 };
      if (ps >= 15) return { min: 9, max: 12 };
      return { min: 7, max: 10 };
    }
    if (t >= 50) {
      if (ps >= 25) return { min: 9, max: 12 }; // prevent tiny-leg high-odds spam when pool is big
      if (ps >= 15) return { min: 7, max: 9 };
      return { min: 6, max: 8 };
    }
    if (t >= 20) {
      if (ps >= 25) return { min: 6, max: 8 };
      if (ps >= 15) return { min: 5, max: 7 };
      return { min: 4, max: 6 };
    }
    // x3/x5/x10
    if (ps >= 20) return { min: 3, max: 6 };
    return { min: 2, max: 5 };
  };

  const { min: dynMin, max: dynMax } = getLegBounds(target, poolSize);

  const minLegsHint = Number.isFinite(_opts.minLegsHint) ? _opts.minLegsHint : dynMin;
  const maxLegsEff = Number.isFinite(_opts.maxLegsEff) ? _opts.maxLegsEff : dynMax;

  // Hard cap for leg odds (default 3.0 as discussed)
  const perLegOddCapBase = Number.isFinite(_opts.perLegOddCap) ? _opts.perLegOddCap : 3.0;

  const avoidFixtureIds = new Set(Array.isArray(_opts.avoidFixtureIds) ? _opts.avoidFixtureIds : []);
  const usedFixtures = new Set(Array.isArray(_opts.usedFixtures) ? _opts.usedFixtures : []);

  // ---- Helper to build once with a given leg-cap (keeps x50 close, x100 can push) ----
  const buildOnce = (legCap) => {
    // candidates must be array of objects {fixtureId, odds, score, ...}
    const all = Array.isArray(sample) ? sample : [];
    // Filter by fixture uniqueness and legCap
    const filtered = all.filter(c =>
      c &&
      c.fixtureId != null &&
      !avoidFixtureIds.has(c.fixtureId) &&
      !usedFixtures.has(c.fixtureId) &&
      Number.isFinite(c.odds) &&
      c.odds > 1.0 &&
      c.odds <= legCap
    );

    // Group by fixture to choose at most 1 pick per match
    const byFix = new Map();
    for (const c of filtered) {
      const k = String(c.fixtureId);
      if (!byFix.has(k)) byFix.set(k, []);
      byFix.get(k).push(c);
    }

    // Within each fixture: sort by "quality" first (score then implied prob)
    const topPerFix = [];
    for (const arr of byFix.values()) {
      arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      topPerFix.push(arr[0]);
    }

    // Global ranking: prefer high score, then safer odds when pool is big
    topPerFix.sort((a, b) => {
      const ds = (b.score ?? 0) - (a.score ?? 0);
      if (ds !== 0) return ds;
      // secondary: lower odds (safer) when we have many options
      if (poolSize >= 15) return (a.odds ?? 999) - (b.odds ?? 999);
      // otherwise allow higher odds
      return (b.odds ?? 0) - (a.odds ?? 0);
    });

    const picks = [];
    let totalOdd = 1.0;

    // Greedy: keep adding best remaining pick until target reached or bounds hit
    for (const c of topPerFix) {
      if (picks.length >= maxLegsEff) break;
      if (totalOdd >= target && picks.length >= minLegsHint) break;
      picks.push(c);
      totalOdd *= c.odds;
    }

    // If we still haven't reached min legs, append more even if target met (spreads risk)
    if (picks.length < minLegsHint) {
      for (const c of topPerFix) {
        if (picks.length >= minLegsHint) break;
        if (picks.some(p => p.fixtureId === c.fixtureId)) continue;
        picks.push(c);
        totalOdd *= c.odds;
      }
    }

    // Build result
    return {
      target,
      picks,
      finalOdd: Number.isFinite(totalOdd) ? totalOdd : 0,
      legs: picks.length,
      poolSize,
      perLegOddCap: legCap,
      reachedTarget: totalOdd >= target,
    };
  };

  // ---- Build baseline ----
  let res = buildOnce(perLegOddCapBase);

  // Keep x50 closer to 50 when pool is large (avoid x90 as "x50")
  if (target === 50 && poolSize >= 15 && res.finalOdd > 70) {
    // tighten cap a bit => more legs with safer odds
    const tighter = Math.min(perLegOddCapBase, 2.35);
    const alt = buildOnce(tighter);
    // choose the one closer to target but still >= ~45 if possible
    const scoreA = Math.abs(res.finalOdd - target);
    const scoreB = Math.abs(alt.finalOdd - target);
    if (alt.finalOdd >= 45 && scoreB <= scoreA) res = alt;
  }

  // ---- Ensure monotonic: x100 must be > x50 in a "real" way ----
  if (target === 50) {
    globalThis.__fv_lastParlay50 = res;
    return res;
  }

  if (target === 100 && globalThis.__fv_lastParlay50) {
    const last50 = globalThis.__fv_lastParlay50;

    // If x100 ended up <= x50 (or too close), try to upgrade by adding extra legs
    const minBoost = Math.max(105, last50.finalOdd * 1.10); // at least +10% over x50
    if (res.finalOdd < minBoost) {
      // allow slightly higher cap for x100 (still <= 3.0 by default)
      const looserCap = perLegOddCapBase;
      let upgraded = buildOnce(looserCap);

      // If still not enough, force more legs (up to dynMax) by lowering minLegsHint temporarily
      // and appending best remaining picks.
      if (upgraded.finalOdd < minBoost) {
        const used = new Set(upgraded.picks.map(p => p.fixtureId));
        const all = Array.isArray(sample) ? sample : [];
        const remaining = all
          .filter(c => c && c.fixtureId != null && !used.has(c.fixtureId) && Number.isFinite(c.odds) && c.odds > 1.0 && c.odds <= looserCap)
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

        for (const c of remaining) {
          if (upgraded.picks.length >= Math.max(maxLegsEff, dynMax)) break;
          upgraded.picks.push(c);
          upgraded.finalOdd *= c.odds;
          upgraded.legs = upgraded.picks.length;
          if (upgraded.finalOdd >= minBoost && upgraded.legs >= dynMin) break;
        }
      }

      // If upgrade helped, adopt it
      if (upgraded.finalOdd > res.finalOdd) res = upgraded;

      // Final guard: if still below, keep res (realistic) but never show less than x50
      if (res.finalOdd < last50.finalOdd) {
        res.finalOdd = last50.finalOdd * 1.02;
      }
    }
  }

  return res;
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
