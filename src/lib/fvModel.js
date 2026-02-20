
function __fv_extendParlay(base, extraPool, minExtra=1){
  const used = new Set(base.map(p=>p.fixtureId));
  const extra = extraPool.filter(p=>p && !used.has(p.fixtureId));
  return base.concat(extra.slice(0,minExtra));
}


function __fv_prioritizeGreenData(pool){
  const full = pool.filter(p => p && p.hasFullData === true);
  if(full.length > 0) return full;
  return pool;
}


function __fv_hardLimitBTTS(picks){
  let count = 0;
  return picks.filter(p=>{
    if(p && p.pickType === "BTTS_NO"){
      if(count >= 1) return false;
      count++;
    }
    return true;
  });
}


// ================= PROFESSIONAL GLOBAL CONSTANTS =================
const FV_GLOBALS = {
  CAP_MAX_NORMAL: 2.5,
  CAP_MAX_STRICT: 2.45,
  MAX_BTTS_PER_PARLAY: 1
};
// =================================================================

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
// Probabilidad de Over X.5 (total goles)
export function probOverLine(lambdaHome, lambdaAway, line) {
  const lH = Math.max(0, Number(lambdaHome) || 0);
  const lA = Math.max(0, Number(lambdaAway) || 0);
  const lt = lH + lA;
  if (!Number.isFinite(lt)) return null;
  // Para over 0.5: 1 - P(0)
  if (line <= 0.5) return clamp(1 - Math.exp(-lt), 0, 1);
  // Para over 1.5: 1 - P(0) - P(1)
  if (line <= 1.5) return clamp(1 - Math.exp(-lt) * (1 + lt), 0, 1);
  // General: sumar Poisson(0..floor(line)) y restar de 1 (aprox)
  const kMax = Math.max(0, Math.floor(line));
  let s = 0;
  for (let k = 0; k <= kMax; k++) {
    s += poissonPmf(k, lt);
  }
  return clamp(1 - s, 0, 1);
}

// Probabilidad de Under X.5 (total goles) usando Poisson total
export function probUnderLineTotal(lambdaHome, lambdaAway, line) {
  const lH = Math.max(0, Number(lambdaHome) || 0);
  const lA = Math.max(0, Number(lambdaAway) || 0);
  const lt = lH + lA;
  if (!Number.isFinite(lt)) return null;
  const thr = Math.max(0, Math.floor(line)); // Under 3.5 => <=3
  let s = 0;
  for (let k = 0; k <= thr; k++) s += poissonPmf(k, lt);
  return clamp(s, 0, 1);
}

// Probabilidad de Handicap +N (local o visita). Aproximación por suma doble Poisson.
export function probHandicapPlus(lambdaHome, lambdaAway, plus, side = "home") {
  const lH = Math.max(0, Number(lambdaHome) || 0);
  const lA = Math.max(0, Number(lambdaAway) || 0);
  const p = Number(plus) || 0;
  if (!Number.isFinite(lH) || !Number.isFinite(lA) || p < 0) return null;

  // Truncamos a 10 goles por equipo (suficiente para +2/+3).
  const maxG = 10;
  let prob = 0;
  for (let gh = 0; gh <= maxG; gh++) {
    const ph = poissonPmf(gh, lH);
    for (let ga = 0; ga <= maxG; ga++) {
      const pa = poissonPmf(ga, lA);
      const ok = side === "away" ? (ga + p > gh) : (gh + p > ga);
      if (ok) prob += ph * pa;
    }
  }
  return clamp(prob, 0, 1);
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
// Hándicap +2 / +3 (muy conservador). Aparece en cuota segura y también puede entrar a parlays.
  const pAhH3 = probHandicapPlus(lambdaHome, lambdaAway, 3, "home");
  if (pAhH3 != null && pAhH3 >= 0.85) {
    out.push({
      fixtureId,
      leagueId,
      homeName,
      awayName,
      market: "AH_P3_HOME",
      label: "Hándicap +3 (Local)",
      pickType: "AH_P3_HOME",
      prob: clamp(pAhH3, 0, 1),
      fvOdd: round2(1 / (clamp(pAhH3, 0.01, 0.999) + 0.04)),
      usedOdd: null,
      dataQuality,
      marketOdd: null,
    });
  }

  const pAhA3 = probHandicapPlus(lambdaHome, lambdaAway, 3, "away");
  if (pAhA3 != null && pAhA3 >= 0.85) {
    out.push({
      fixtureId,
      leagueId,
      homeName,
      awayName,
      market: "AH_P3_AWAY",
      label: "Hándicap +3 (Visita)",
      pickType: "AH_P3_AWAY",
      prob: clamp(pAhA3, 0, 1),
      fvOdd: round2(1 / (clamp(pAhA3, 0.01, 0.999) + 0.04)),
      usedOdd: null,
      dataQuality,
      marketOdd: null,
    });
  }

  const pAhH2 = probHandicapPlus(lambdaHome, lambdaAway, 2, "home");
  if (pAhH2 != null && pAhH2 >= 0.80) {
    out.push({
      fixtureId,
      leagueId,
      homeName,
      awayName,
      market: "AH_P2_HOME",
      label: "Hándicap +2 (Local)",
      pickType: "AH_P2_HOME",
      prob: clamp(pAhH2, 0, 1),
      fvOdd: round2(1 / (clamp(pAhH2, 0.01, 0.999) + 0.05)),
      usedOdd: null,
      dataQuality,
      marketOdd: null,
    });
  }

  const pAhA2 = probHandicapPlus(lambdaHome, lambdaAway, 2, "away");
  if (pAhA2 != null && pAhA2 >= 0.80) {
    out.push({
      fixtureId,
      leagueId,
      homeName,
      awayName,
      market: "AH_P2_AWAY",
      label: "Hándicap +2 (Visita)",
      pickType: "AH_P2_AWAY",
      prob: clamp(pAhA2, 0, 1),
      fvOdd: round2(1 / (clamp(pAhA2, 0.01, 0.999) + 0.05)),
      usedOdd: null,
      dataQuality,
      marketOdd: null,
    });
  }

  // Over 0.5 goles (muy conservador)
  const pOver05 = probOverLine(lambdaHome, lambdaAway, 0.5);
  if (pOver05 != null) {
    out.push({
      fixtureId,
      leagueId,
      homeName,
      awayName,
      market: "OU_05",
      label: "Over 0.5 goles",
      pickType: "OU_O05",
      prob: clamp(pOver05, 0, 1),
      fvOdd: round2(1 / (clamp(pOver05, 0.01, 0.999) + 0.03)),
      usedOdd: null,
      dataQuality,
    });
  }
// Over 1.5 goles (más conservador, útil para ajustar cuotas con muchos partidos)
  out.push({
    market: "OU_15",
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


  // Reglas: si hay >=10 fixtures con datos completos (verde), el regalo debe ser combinada de 3 a 4 picks.
  // Si no, mostrar solo 1 pick (el más seguro) y siempre priorizar fixtures con dataQuality === "full".
  const fullFixtureCount = Object.values(candidatesByFixture || {}).filter((list) => {
    const arr = Array.isArray(list) ? list : [];
    return arr.some((c) => c && c.dataQuality === "full");
  }).length;

  const giftMinLegsEff = fullFixtureCount >= 10 ? 3 : 1;
  const giftMaxLegsEff = fullFixtureCount >= 10 ? Math.min(4, pool.length || 4) : 1;

  // Evitar repetir demasiados BTTS NO en el regalo (máximo 1).
  let giftBttsCount = 0;

  // Rotación simple de tipo de pick (para que no salga siempre AH +3).
  const _cat = (c) => {
    const t = String(c?.pickType || "");
    if (t.startsWith("AH")) return "AH";
    if (t.startsWith("OU")) return "OU";
    if (t.startsWith("DC")) return "DC";
    if (t.startsWith("BTTS")) return "BTTS";
    return "OTHER";
  };
  const lastGiftCat = (_fv_lastGiftCat || null);
  // Orden: mayor prob, luego preferir categoría distinta a la anterior.
  pool.sort((a, b) => {
    const pa = pr(a), pb = pr(b);
    if (pb !== pa) return pb - pa;
    const da = (_cat(a) === lastGiftCat) ? 1 : 0;
    const db = (_cat(b) === lastGiftCat) ? 1 : 0;
    if (da !== db) return da - db; // el que NO repite va primero
    return (Number(a.usedodd) || 9) - (Number(b.usedodd) || 9);
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
    if (prod >= minOdd && legs.length >= giftMinLegsEff) break;
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

  const poolSize = candAll.length;

  // ---------- Reglas de legs (EXACTAS) según cantidad de fixtures ----------
  const byFix = candidatesByFixture || {};
  const poolFixtures = Object.keys(byFix).length;

  const legsRangeByPool = (pf, target) => {
    const isBig = pf > 18;
    const isMid = pf >= 10;

    if (isBig) {
      if (target >= 100) return { min: 9, max: 12 };
      if (target >= 50)  return { min: 8, max: 11 };
      if (target >= 20)  return { min: 7, max: 10 };
      return { min: 6, max: 9 };
    }
    if (isMid) {
      if (target >= 100) return { min: 8, max: 11 };
      if (target >= 50)  return { min: 7, max: 10 };
      if (target >= 20)  return { min: 6, max: 9 };
      return { min: 5, max: 8 };
    }
    if (target >= 100) return { min: 7, max: 10 };
    if (target >= 50)  return { min: 6, max: 9 };
    if (target >= 20)  return { min: 5, max: 8 };
    return { min: 4, max: 7 };
  };

  const range = legsRangeByPool(poolFixtures, t);
  let minLegs = clamp(range.min, 1, Math.max(1, poolFixtures || range.min));
  let maxLegs = clamp(range.max, minLegs, Math.max(minLegs, poolFixtures || range.max));

  const wantDiversity = poolFixtures >= 10;

const capLegOddBase = poolFixtures > 18 ? 2.45 : 2.5;
  const capLegOdd = safeNum(opts.capLegOdd, capLegOddBase);

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

  const scored = candAll
    .filter(c => safeNum(c.prob, 0) >= probFloor && safeNum(c.odd, 0) >= 1.05)
    .map(c => {
      const odd = safeNum(c.odd, 1.0);
      const prob = safeNum(c.prob, 0);
      const edge = safeNum(c.edge, 0);

      // Prefer higher prob + positive edge + lower odds
      const score = (prob * 1.2) + (edge * 0.8) - (Math.log(odd) * 0.25);

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
    let bttsCount = 0;
    let hasOU = false;
    let hasAH = false;

    const isOU = (c) => String(c?.type || c?.pickType || "").startsWith("OU");
    const isAH = (c) => String(c?.type || c?.pickType || "").startsWith("AH");
    const isBTTSNO = (c) => String(c?.type || c?.pickType || "") === "BTTS_NO";

    const addCand = (c) => {
      legs.push(c);
      usedFix.add(String(c.fixtureId));
      const o = _fv_legOdd(c);
      if (Number.isFinite(o) && o > 1) prod *= o;
      if (isBTTSNO(c)) bttsCount++;
      if (isOU(c)) hasOU = true;
      if (isAH(c)) hasAH = true;
    };


    const maxLegOddEff = relax ? Math.max(capLegOdd, 3.75) : capLegOdd;
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

    // Sembrar diversidad: si hay suficiente pool, intentamos meter al menos 1 OU y 1 AH (si existen),
    // antes del greedy principal. Esto evita que se llene de BTTS o un solo mercado.
    if (wantDiversity) {
      const hasAnyOU = sortedPool.some(isOU);
      const hasAnyAH = sortedPool.some(isAH);

      const pickOne = (pred) => {
        for (const c of sortedPool) {
          if (!c || !pred(c)) continue;
          if (!c.fixtureId && c.fixtureId !== 0) continue;
          if (usedFix.has(String(c.fixtureId))) continue;
          const o = _fv_legOdd(c);
          if (!Number.isFinite(o) || o <= 1 || o > capLegOdd) continue;
          if (isBTTSNO(c) && bttsCount >= 1) continue;
          addCand(c);
          return true;
        }
        return false;
      };

      if (hasAnyOU) pickOne(isOU);
      if (hasAnyAH) pickOne(isAH);
    }
}
