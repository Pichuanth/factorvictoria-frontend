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
    market: "OU_15",
    selection: "over",
    label: "Over 1.5 goles",
    prob: over15,
    fvOdd: fairOddFromProb(over15),
    marketOdd: markets?.OU_15?.over ?? markets?.OU_15?.o ?? null,
  });

  // Over 0.5 goles (ultra conservador)
  const over05 = clamp(1 - poissonP(0, lambdaTotal), 0.01, 0.99);
  out.push({
    market: "OU_05",
    selection: "over",
    label: "Over 0.5 goles",
    prob: over05,
    fvOdd: fairOddFromProb(over05),
    marketOdd: markets?.OU_05?.over ?? markets?.OU_05?.o ?? null,
  });

  // Handicap +2 / +3 (local/visita) para parlays conservadores.
  // Definición: Home +K => P(hg + K >= ag). Away +K => P(ag + K >= hg).
  const matH = scoreMatrix(lambdaHome, lambdaAway, 6);
  const probHomePlus = (k) => {
    let s = 0;
    for (const c of matH) if ((c.hg + k) >= c.ag) s += c.p;
    return clamp(s, 0.05, 0.98);
  };
  const probAwayPlus = (k) => {
    let s = 0;
    for (const c of matH) if ((c.ag + k) >= c.hg) s += c.p;
    return clamp(s, 0.05, 0.98);
  };

  const hcp2 = probHomePlus(2);
  const hcp3 = probHomePlus(3);
  const acp2 = probAwayPlus(2);
  const acp3 = probAwayPlus(3);

  out.push({
    market: "AH",
    selection: "home+2",
    label: "Hándicap +2 (Local)",
    prob: hcp2,
    fvOdd: fairOddFromProb(hcp2),
    marketOdd: markets?.AH?.home_p2 ?? markets?.AH?.homePlus2 ?? markets?.AH?.h2 ?? null,
  });

  out.push({
    market: "AH",
    selection: "home+3",
    label: "Hándicap +3 (Local)",
    prob: hcp3,
    fvOdd: fairOddFromProb(hcp3),
    marketOdd: markets?.AH?.home_p3 ?? markets?.AH?.homePlus3 ?? markets?.AH?.h3 ?? null,
  });

  out.push({
    market: "AH",
    selection: "away+2",
    label: "Hándicap +2 (Visita)",
    prob: acp2,
    fvOdd: fairOddFromProb(acp2),
    marketOdd: markets?.AH?.away_p2 ?? markets?.AH?.awayPlus2 ?? markets?.AH?.a2 ?? null,
  });

  out.push({
    market: "AH",
    selection: "away+3",
    label: "Hándicap +3 (Visita)",
    prob: acp3,
    fvOdd: fairOddFromProb(acp3),
    marketOdd: markets?.AH?.away_p3 ?? markets?.AH?.awayPlus3 ?? markets?.AH?.a3 ?? null,
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

  // REGLA: si existe al menos 1 partido con datos completos (racha home+away),
  // la cuota segura (regalo) DEBE salir de ese subconjunto.
  const full = all.filter(p => p?.dataQuality === "full");
  const pool = full.length ? full : all;

  // Orden: mayor probabilidad (conservadora) y luego menor cuota.
  pool.sort((a, b) => (pr(b) - pr(a)) || (Number(a.usedOdd) - Number(b.usedOdd)));
  return pool[0] || null;
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
  const byFix = candidatesByFixture || {};
  const poolFixtures = Object.keys(byFix).length;
  const candAll = Object.values(byFix).flat();

  const safeNum = (x, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

  // ====== Reglas EXACTAS del usuario ======
  const capLegOdd =
    poolFixtures > 18 ? CAP_MAX_STRICT :
    poolFixtures > 10 ? CAP_MAX_NORMAL :
    CAP_MAX_NORMAL;

  function minLegsForTarget() {
    if (poolFixtures > 18) {
      if (t >= 100) return 9;
      if (t >= 50)  return 8;
      if (t >= 20)  return 7;
      if (t >= 10)  return 6;
    }
    if (poolFixtures > 10) {
      if (t >= 100) return 8;
      if (t >= 50)  return 7;
      if (t >= 20)  return 6;
      if (t >= 10)  return 5;
    }
    // Default conservador para pools pequeños
    if (t >= 100) return 7;
    if (t >= 50)  return 6;
    if (t >= 20)  return 5;
    if (t >= 10)  return 3;
    return 2;
  }

  const minLegs = minLegsForTarget();
  const maxLegs = clamp(minLegs + 6, minLegs, 15);

  // Rango de cuota final (mantener x50/x100 en rango profesional)
  const targetMinMul = safeNum(opts.targetMinMul, 0.92);
  const targetMaxMul =
    t >= 100 ? 1.60 :
    t >= 50  ? 1.35 :
    t >= 20  ? 1.35 : 2.00;

  let minFactor = t * targetMinMul;
  let maxFactor = t * targetMaxMul;

  // x100 debe ser > x50 (no clon)
  if (typeof window !== "undefined" && t >= 100) {
    const last50 = safeNum(window.__fv_lastParlay50, 0);
    if (last50 > 0) minFactor = Math.max(minFactor, last50 * 1.10);
  }

  const probFloor =
    t >= 100 ? 0.54 :
    t >= 50  ? 0.56 :
    t >= 20  ? 0.58 : 0.60;

  const norm = (s) => String(s || "").toLowerCase();

  const isBTTSNo = (c) => {
    const m = norm(c?.market);
    const sel = norm(c?.selection);
    const lab = norm(c?.label);
    return (m === "btts" && (sel === "no" || sel.includes("no"))) ||
           (lab.includes("ambos") && lab.includes("marcan") && lab.includes("no"));
  };

  const marketKey = (c) => `${String(c.fixtureId)}|${String(c.market)}|${String(c.selection)}`;

  // scoring: prob + pequeño bonus por variedad (OU_05/OU_15/AH) y penalizar BTTS para que no domine
  function score(c) {
    const p = pr(c);
    const odd = __fv_legOdd(c);
    const edge = safeNum(c?.valueEdge, 0);

    let s = p + Math.max(0, edge) * 0.06;

    const m = String(c?.market || "").toUpperCase();
    if (m === "AH") s += 0.06;
    if (m === "OU_05" || m === "OU_15" || m === "OU_35" || m === "OU_25") s += 0.04;
    if (isBTTSNo(c)) s -= 0.08; // BTTS solo complemento

    // odds suaves: preferir cuotas bajas para alta precisión
    s -= Math.log(Math.max(1.01, odd)) * 0.20;

    return s;
  }

  // pool filtrado (prob y cap)
  const scored = candAll
    .filter(c => safeNum(c?.fixtureId, null) != null)
    .filter(c => pr(c) >= probFloor)
    .filter(c => __fv_legOdd(c) >= 1.05 && __fv_legOdd(c) <= capLegOdd)
    .sort((a,b) => score(b) - score(a));

  if (!scored.length) return null;

  // ====== Build con reglas: 1 pick por fixture + BTTS max 1 + mix ======
  const usedFixture = new Set();
  const usedLeg = new Set();
  let bttsCount = 0;

  const legs = [];
  let prod = 1;

  function tryAdd(c) {
    const fid = c.fixtureId;
    if (usedFixture.has(fid)) return false;
    const key = marketKey(c);
    if (usedLeg.has(key)) return false;

    const odd = __fv_legOdd(c);
    if (odd > capLegOdd) return false;

    if (isBTTSNo(c)) {
      if (bttsCount >= MAX_BTTS_PER_PARLAY) return false;
    }

    // ok add
    legs.push(c);
    usedFixture.add(fid);
    usedLeg.add(key);
    prod *= odd;
    if (isBTTSNo(c)) bttsCount++;

    return true;
  }

  // 1) Seed mix: AH (+3/+2), OU (O0.5 / O1.5), luego DC (si falta)
  const preferOrders = [
    (c) => String(c.market).toUpperCase() === "AH",
    (c) => ["OU_05","OU_15"].includes(String(c.market).toUpperCase()) && String(c.selection).toLowerCase()==="over",
    (c) => String(c.market).toUpperCase() === "DC",
  ];

  for (const pred of preferOrders) {
    const pick = scored.find(c => pred(c) && !usedFixture.has(c.fixtureId) && __fv_legOdd(c) <= capLegOdd);
    if (pick) tryAdd(pick);
  }

  // 2) Greedy fill
  for (const c of scored) {
    if (legs.length >= maxLegs) break;

    // If we're already close, avoid huge overshoot
    const odd = __fv_legOdd(c);
    const projected = prod * odd;
    const close = prod >= (t * 0.70);
    if (close && projected > maxFactor) continue;

    tryAdd(c);

    if (legs.length >= minLegs && prod >= minFactor && prod <= maxFactor) break;
  }

  // 3) If still below minFactor, relax overshoot a bit (but keep capLegOdd)
  if (prod < minFactor) {
    for (const c of scored) {
      if (legs.length >= maxLegs) break;
      if (usedFixture.has(c.fixtureId)) continue;
      tryAdd(c);
      if (legs.length >= minLegs && prod >= minFactor) break;
    }
  }

  if (legs.length < minLegs) return null;

  // 4) HARD LIMIT: BTTS NO max 1 (última barrera)
  const legsHard = [];
  let hardBTTS = 0;
  for (const c of legs) {
    if (isBTTSNo(c)) {
      if (hardBTTS >= 1) continue;
      hardBTTS++;
    }
    legsHard.push(c);
  }

  // Recalcular producto por si sacamos BTTS extra
  prod = 1;
  for (const c of legsHard) prod *= __fv_legOdd(c);

  const picks = legsHard.map(l => ({
    fixtureId: l.fixtureId,
    type: l.market,
    label: l.label,
    odd: round2(__fv_legOdd(l)),
    prob: round2(Number(l.prob)),
    edge: l.valueEdge,
    home: l.home,
    away: l.away,
  }));

  const finalOdd = prod;

  const out = {
    target: t,
    finalOdd,
    legs: picks,
    legsCount: picks.length,
    final: `x${round2(finalOdd)}`,
  };

  // Persist last x50 for monotonic x100
  if (typeof window !== "undefined" && t >= 50 && t < 100) {
    window.__fv_lastParlay50 = finalOdd;
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
