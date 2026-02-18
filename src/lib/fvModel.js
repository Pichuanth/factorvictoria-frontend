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

export 
// --- Handicap helpers (approx via truncated Poisson convolution) ---
// Probability that "forTeam" does NOT lose by more than `margin` goals.
// For home +2: P(home - away >= -2). For away +2: P(away - home >= -2) == P(home - away <= 2).
function __fv_poissonPmf(k, lambda) {
  if (k < 0) return 0;
  const l = Number(lambda);
  if (!Number.isFinite(l) || l <= 0) return k === 0 ? 1 : 0;
  // compute iteratively to avoid factorial overflow for small k (k<=12 typical)
  let p0 = Math.exp(-l);
  if (k === 0) return p0;
  let p = p0;
  for (let i = 1; i <= k; i++) p = (p * l) / i;
  return p;
}

function probNotLoseByMoreThan(lambdaFor, lambdaAgainst, margin, maxGoals = 8) {
  const m = Number(margin);
  const maxG = Math.max(6, Math.min(12, Number(maxGoals) || 8));
  const lf = clamp(Number(lambdaFor) || 0, 0.2, 3.2);
  const la = clamp(Number(lambdaAgainst) || 0, 0.2, 3.2);

  let prob = 0;
  for (let gf = 0; gf <= maxG; gf++) {
    const pf = __fv_poissonPmf(gf, lf);
    for (let ga = 0; ga <= maxG; ga++) {
      const pa = __fv_poissonPmf(ga, la);
      if ((gf - ga) >= (-m)) prob += pf * pa;
    }
  }
  return clamp(prob, 0.01, 0.99);
}

function probBTTSNo(lambdaHome, lambdaAway) {
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
  // Hándicap +2 / +3 (relleno conservador cuando hay muchos partidos)
  // Se calcula con aproximación Poisson (no pierde por más de N goles).
  const hHome2 = probNotLoseByMoreThan(lambdaHome, lambdaAway, 2);
  const hAway2 = probNotLoseByMoreThan(lambdaAway, lambdaHome, 2);
  const hHome3 = probNotLoseByMoreThan(lambdaHome, lambdaAway, 3);
  const hAway3 = probNotLoseByMoreThan(lambdaAway, lambdaHome, 3);

  out.push({
    market: "AH",
    selection: "home+2",
    label: "Hándicap +2 (Local)",
    prob: hHome2,
    fvOdd: fairOddFromProb(hHome2),
    marketOdd: markets?.AH?.home_plus2 ?? markets?.AH?.home_p2 ?? markets?.AH?.["+2_home"] ?? null,
  });

  out.push({
    market: "AH",
    selection: "away+2",
    label: "Hándicap +2 (Visita)",
    prob: hAway2,
    fvOdd: fairOddFromProb(hAway2),
    marketOdd: markets?.AH?.away_plus2 ?? markets?.AH?.away_p2 ?? markets?.AH?.["+2_away"] ?? null,
  });

  out.push({
    market: "AH",
    selection: "home+3",
    label: "Hándicap +3 (Local)",
    prob: hHome3,
    fvOdd: fairOddFromProb(hHome3),
    marketOdd: markets?.AH?.home_plus3 ?? markets?.AH?.home_p3 ?? markets?.AH?.["+3_home"] ?? null,
  });

  out.push({
    market: "AH",
    selection: "away+3",
    label: "Hándicap +3 (Visita)",
    prob: hAway3,
    fvOdd: fairOddFromProb(hAway3),
    marketOdd: markets?.AH?.away_plus3 ?? markets?.AH?.away_p3 ?? markets?.AH?.["+3_away"] ?? null,
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

  // Robust numeric parser (handles "x3.6", "3,6", etc.)
  const safeNum = (x, d = 0) => {
    if (typeof x === "number" && Number.isFinite(x)) return x;
    if (typeof x === "string") {
      const s = String(x).trim().replace(",", ".");
      const m = s.match(/-?\d+(\.\d+)?/);
      if (m) {
        const v = Number(m[0]);
        if (Number.isFinite(v)) return v;
      }
    }
    return d;
  };

  const getOdd = (c) => {
    // Prefer the effective odd used by the engine / UI
    return safeNum(
      c?.usedOdd ??
      c?.usedOddDisplay ??
      c?.marketOdd ??
      c?.fvOdd ??
      c?.odd ??
      c?.price ??
      null,
      0
    );
  };

  const getProb = (c) => {
    // Prefer confidence-adjusted prob if present
    const p = safeNum(c?.__probRank ?? c?.prob ?? null, 0);
    if (p > 0 && p < 1) return p;
    const odd = getOdd(c);
    // Conservative fallback when prob missing: ~1/odd, clamped
    if (odd > 1.01) return clamp(1 / odd, 0.20, 0.92);
    return 0;
  };

  const getEdge = (c) => {
    return safeNum(c?.valueEdge ?? c?.edge ?? null, 0);
  };

  const getMarketTag = (c) => {
    const m = String(c?.market || c?.type || "").toUpperCase();
    const label = String(c?.label || "").toLowerCase();

    if (label.includes("ambos marcan") || m.includes("BTTS")) return "BTTS";
    if (label.includes("hándicap") || label.includes("handicap") || m === "AH") return "AH";
    if (label.includes("over") || label.includes("under") || m.includes("OU")) return "OU";
    if (label.includes("doble oportunidad") || m === "DC") return "DC";
    return m || "OTHER";
  };

  // Pool size should represent *available matches*, not raw candidate count nor date-group keys.
  // Some upstream shapes group by date/league; also some candidates may miss fixtureId.
  // We therefore estimate pool size using the maximum of:
  //  - key count
  //  - distinct fixtureId count (when available)
  //  - a candidate-count heuristic (avg ~3 candidates per match)
  const poolMatches = (() => {
    const keyCount = Object.keys(candidatesByFixture || {}).length;
    const s = new Set();
    for (const c of candAll) {
      const id = c?.fixtureId ?? c?.fixture?.id ?? c?.fixture_id;
      if (id != null) s.add(String(id));
    }
    const idCount = s.size;
    const heuristic = Math.round((candAll?.length || 0) / 3);
    return Math.max(keyCount, idCount, clamp(heuristic, 0, 60));
  })();

  // ---------- Dynamic legs range (pool-aware; more aggressive on big pools) ----------
  const baseRange =
    t >= 100 ? { min: 9,  max: 15 } :
    t >= 50  ? { min: 7,  max: 12 } :
    t >= 20  ? { min: 5,  max: 10 } :
    t >= 10  ? { min: 3,  max: 7  } :
    t >= 5   ? { min: 2,  max: 6  } :
               { min: 2,  max: 5  };

  let minLegs = baseRange.min;
  let maxLegs = baseRange.max;

  if (poolMatches >= 30) {
    if (t >= 100) { minLegs = 12; maxLegs = 15; }
    else if (t >= 50) { minLegs = 10; maxLegs = 13; }
    else if (t >= 20) { minLegs = 8;  maxLegs = 11; }
    else if (t >= 10) { minLegs = 5;  maxLegs = 9; }
    else if (t >= 5)  { minLegs = 4;  maxLegs = 8; }
  } else if (poolMatches >= 20) {
    if (t >= 100) { minLegs = 10; maxLegs = 14; }
    else if (t >= 50) { minLegs = 9;  maxLegs = 12; }
    else if (t >= 20) { minLegs = 7;  maxLegs = 10; }
    else if (t >= 10) { minLegs = 5;  maxLegs = 8; }
    else if (t >= 5)  { minLegs = 4;  maxLegs = 7; }
  } else if (poolMatches >= 10) {
    if (t >= 100) { minLegs = 8; maxLegs = 12; }
    else if (t >= 50) { minLegs = 7; maxLegs = 10; }
    else if (t >= 20) { minLegs = 6; maxLegs = 9; }
    else if (t >= 10) { minLegs = 4; maxLegs = 7; }
    else if (t >= 5)  { minLegs = 3; maxLegs = 6; }
  } else {
    minLegs = Math.max(2, minLegs - 1);
  }

  minLegs = clamp(minLegs, 2, 15);
  maxLegs = clamp(maxLegs, minLegs, 15);

  // Desired legs (push higher on large pools so we don't rely on high odds)
  const targetLegs = (() => {
    let want = minLegs;
    if (poolMatches >= 30) {
      if (t >= 100) want = 14;
      else if (t >= 50) want = 12;
      else if (t >= 20) want = 10;
      else if (t >= 10) want = 6;
      else if (t >= 5)  want = 5;
      else              want = 4;
    } else if (poolMatches >= 20) {
      if (t >= 100) want = 13;
      else if (t >= 50) want = 11;
      else if (t >= 20) want = 9;
      else if (t >= 10) want = 6;
      else if (t >= 5)  want = 5;
      else              want = 4;
    } else if (poolMatches >= 10) {
      if (t >= 100) want = Math.max(minLegs, 9);
      else if (t >= 50) want = Math.max(minLegs, 8);
      else if (t >= 20) want = Math.max(minLegs, 7);
      else if (t >= 10) want = Math.max(minLegs, 5);
      else if (t >= 5)  want = Math.max(minLegs, 4);
      else              want = Math.max(minLegs, 3);
    }
    return clamp(want, minLegs, maxLegs);
  })();

  // ---------- Odds cap per leg ----------
  // User intent: when pool is big, avoid 3.x odds; add legs with 1.2–1.8 instead.
  const hardCap = poolMatches >= 10 ? 2.90 : 3.50;

  const capLegOddBase = (() => {
    // Geometric targeting: for a desired number of legs, the "ideal" per-leg odd is target^(1/legs).
    // We then allow a small slack so we can still build even if market set is limited.
    const want = Math.max(2, Number(targetLegs) || 2);
    const ideal = Math.pow(Math.max(1.01, t), 1 / want);

    // Slack is smaller when pool is big (force more legs with lower odds)
    const slack = poolMatches >= 30 ? 1.12 : poolMatches >= 20 ? 1.15 : poolMatches >= 12 ? 1.20 : 1.28;

    // Extra clamp to avoid 3.x when pool has enough matches
    const poolCap = poolMatches >= 20 ? 2.60 : poolMatches >= 10 ? 2.90 : hardCap;

    return clamp(ideal * slack, 1.25, Math.min(hardCap, poolCap));
  })();

  const capFromTargetLegs = (() => {
    const want = Math.max(2, Number(targetLegs) || 2);
    const base = Math.pow(Math.max(1.01, t), 1 / want);
    // allow modest slack, but keep conservative
    return clamp(base * (poolMatches >= 20 ? 1.15 : poolMatches >= 12 ? 1.20 : 1.28), 1.25, hardCap);
  })();

  const capLegOdd = safeNum(opts.capLegOdd, Math.min(hardCap, capLegOddBase, capFromTargetLegs));

  // ---------- Target range ----------
  const targetMinBase = safeNum(opts.targetMinMul, 0.92);
  const targetMaxMul =
    t >= 100 ? 1.60 :
    t >= 50  ? 1.35 :
    t >= 20  ? 1.35 : 2.00;

  let minFactor = t * targetMinBase;
  let maxFactor = t * targetMaxMul;

  // Monotonic guarantee: x100 > x50
  if (t >= 100 && typeof window !== "undefined") {
    const last50 = safeNum(window.__fv_lastParlay50, 0);
    if (last50 > 0) minFactor = Math.max(minFactor, last50 * 1.10);
  }

  // ---------- Scoring ----------
  const probFloorBase =
    t >= 100 ? 0.52 :
    t >= 50  ? 0.54 :
    t >= 20  ? 0.56 : 0.58;

  const probFloor = safeNum(opts.probFloor, probFloorBase);

  const isSafeFiller = (c) => {
    const label = String(c?.label || "").toLowerCase();
    return (
      label.includes("over 1.5") ||
      label.includes("under 3.5") ||
      label.includes("hándicap +2") ||
      label.includes("handicap +2") ||
      label.includes("hándicap +3") ||
      label.includes("handicap +3")
    );
  };

  const isBttsNo = (c) => String(c?.label || "").toLowerCase().includes("ambos marcan: no");

  const scored = candAll
    .map(c => {
      const odd = getOdd(c);
      const prob = getProb(c);
      const edge = getEdge(c);

      // Filter invalids here (use our derived odd/prob)
      if (!(odd >= 1.05)) return null;
      if (!(prob >= probFloor && prob < 0.999)) return null;
      if (odd > capLegOdd) return null;

      // Penalize high odds more when pool is large
      const oddPenalty = poolMatches >= 20 ? 0.55 : poolMatches >= 12 ? 0.40 : 0.28;
      const hiOddPenalty = (poolMatches >= 20 && odd >= 2.40) ? 0.08 : 0;

      // Boost safe fillers when we want many legs
      const fillerBonus = (poolMatches >= 20 && isSafeFiller(c)) ? 0.42 : (poolMatches >= 12 && isSafeFiller(c)) ? 0.30 : (poolMatches >= 8 && isSafeFiller(c)) ? 0.18 : 0;

      // Penalize BTTS NO so it doesn't dominate
      const bttsPenalty = (poolMatches >= 20 && isBttsNo(c)) ? 0.55 : (poolMatches >= 12 && isBttsNo(c)) ? 0.40 : (poolMatches >= 8 && isBttsNo(c)) ? 0.25 : 0;

      const score = (prob * 1.25) + (edge * 0.55) - (Math.log(odd) * oddPenalty) - hiOddPenalty + fillerBonus - bttsPenalty;

      const home = (c.home && String(c.home).trim()) || (c.fixture?.teams?.home?.name) || "Local";
      const away = (c.away && String(c.away).trim()) || (c.fixture?.teams?.away?.name) || "Visita";

      return { ...c, home, away, __score: score, __oddEff: odd, __probEff: prob, __edgeEff: edge, __marketTag: getMarketTag(c) };
    })
    .filter(Boolean)
    .sort((a, b) => b.__score - a.__score);

  // ---------- Mix caps (avoid ugly repetition) ----------
  const caps = (() => {
    if (poolMatches >= 30) return { BTTS: 1, DC: 3, OU: 5, AH: 4, OTHER: 6 };
    if (poolMatches >= 20) return { BTTS: 1, DC: 3, OU: 5, AH: 4, OTHER: 6 };
    if (poolMatches >= 10) return { BTTS: 1, DC: 3, OU: 5, AH: 4, OTHER: 6 };
    return { BTTS: 2, DC: 3, OU: 4, AH: 3, OTHER: 6 };
  })();

  function greedyBuild({ relax = false } = {}) {
    const legs = [];
    let prod = 1;

    const usedFixture = new Set();
    const marketCount = { BTTS: 0, DC: 0, OU: 0, AH: 0, OTHER: 0 };

    const maxLegOddEff = relax ? hardCap : capLegOdd;
    const maxFactorEff = relax ? maxFactor * 1.20 : maxFactor;
    const minFactorEff = relax ? minFactor * 0.95 : minFactor;

    const canAddMarket = (tag) => (marketCount[tag] ?? 0) < (caps[tag] ?? 99);

    for (const c of scored) {
      const fixtureId = c.fixtureId ?? c.fixture?.id ?? c.fixture_id;
      if (fixtureId == null) continue;
      if (usedFixture.has(fixtureId)) continue;

      const odd = safeNum(c.__oddEff, getOdd(c));
      if (odd <= 1.01) continue;
      if (odd > maxLegOddEff) continue;

      const tag = c.__marketTag || "OTHER";
      if (!canAddMarket(tag)) continue;

      const projected = prod * odd;

      // If we're already close, avoid huge overshoot (keep within range)
      const close = prod >= (t * 0.70);
      if (!relax && close && projected > maxFactorEff) continue;

      legs.push(c);
      usedFixture.add(fixtureId);
      marketCount[tag] = (marketCount[tag] ?? 0) + 1;
      prod = projected;

      if (legs.length >= targetLegs && prod >= minFactorEff) {
        if (prod <= maxFactorEff) break;
      }
      if (legs.length >= maxLegs) break;
    }

    // Fill: add more legs (still respecting caps) if below minFactor or below desired legs
    if ((prod < minFactorEff || legs.length < targetLegs) && legs.length < maxLegs) {
      for (const c of scored) {
        const fixtureId = c.fixtureId ?? c.fixture?.id ?? c.fixture_id;
        if (fixtureId == null || usedFixture.has(fixtureId)) continue;

        const odd = safeNum(c.__oddEff, getOdd(c));
        if (odd <= 1.01) continue;
        if (odd > maxLegOddEff) continue;

        const tag = c.__marketTag || "OTHER";
        if (!canAddMarket(tag)) continue;

        legs.push(c);
        usedFixture.add(fixtureId);
        marketCount[tag] = (marketCount[tag] ?? 0) + 1;
        prod *= odd;

        if (legs.length >= maxLegs) break;
        if (legs.length >= targetLegs && prod >= minFactorEff) break;
      }
    }

    if (legs.length < Math.min(minLegs, maxLegs)) return null;
    return { legs, prod };
  }

  let built = greedyBuild({ relax: false });
  if (!built && t >= 50) built = greedyBuild({ relax: true });
  if (!built) return null;

  const finalOdd = built.prod;

  const picks = built.legs.map(l => ({
    fixtureId: l.fixtureId ?? l.fixture?.id ?? l.fixture_id,
    type: l.type ?? l.market,
    label: l.label,
    odd: safeNum(l.__oddEff, getOdd(l)),
    prob: safeNum(l.__probEff, getProb(l)),
    edge: safeNum(l.__edgeEff, getEdge(l)),
    home: l.home,
    away: l.away,
  }));

  const out = {
    target: t,
    finalOdd,
    legs: picks,
    legsCount: picks.length,
    final: `x${round2(finalOdd)}`,
  };

  if (typeof window !== "undefined" && t >= 50 && t < 100) {
    window.__fv_lastParlay50 = finalOdd;
  }
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
