// src/lib/fvModel.js
// Motor MVP de probabilidades + armado de parlays para Factor Victoria.

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
function getFixtureId(obj) {
  const v =
    obj?.fixtureId ??
    obj?.fixture?.fixture?.id ??
    obj?.fixture?.id ??
    obj?.fixture?.fixture_id ??
    obj?.id;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : v != null ? String(v) : "";
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
// Poisson PMF
function poissonPmf(lambda, k) {
  if (lambda <= 0) return 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
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

  const fixtureId =
      Number(fixture?.fixture?.id ?? fixture?.id ?? pack?.fixtureId ?? fixture?.fixture_id ?? pack?.id) || null;
    const leagueId =
      Number(fixture?.league?.id ?? pack?.leagueId ?? fixture?.league_id ?? pack?.league?.id) || null;
    const homeName =
      fixture?.teams?.home?.name ?? pack?.teams?.home?.name ?? fixture?.home?.name ?? "Home";
    const awayName =
      fixture?.teams?.away?.name ?? pack?.teams?.away?.name ?? fixture?.away?.name ?? "Away";

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

let _fv_lastGiftCat = null; // para rotar el tipo de pick en la "Cuota segura (regalo)"

export function buildGiftPickBundle(candidatesByFixture, minOdd = 1.5, maxOdd = 3.0, minLegsHint = 3) {
  const fixtures = Object.entries(candidatesByFixture || {});
  if (!fixtures.length) return { legs: [] };

  // Determinar cuántos fixtures tienen "datos completos"
  const isFullFixture = (arr) => (arr || []).some((c) => c?.dataQuality === "full" || c?.dataQuality === "complete");

  const fullFixtures = fixtures.filter(([, arr]) => isFullFixture(arr));
  const fullCount = fullFixtures.length;

  // Reglas:
  // - Si hay >=10 fixtures con datos completos => 3-4 legs (siempre que entren bajo cuota total <= 3.0)
  // - Si no => 1 leg (la más segura con datos completos; si no hay, la mejor disponible)
  const minLegs = fullCount >= 10 ? Math.max(3, Number(minLegsHint) || 3) : 1;
  const maxLegs = fullCount >= 10 ? 4 : 1;

  const HARD_MAX_TOTAL = 3.0;
  const HARD_MAX_LEG = Math.min(Number(maxOdd) || 3.0, 3.0);

  const catOf = (c) => {
    const m = String(c?.market ?? "").toUpperCase();
    const lab = String(c?.label ?? "").toUpperCase();
    if (m.includes("AH") || lab.includes("HANDICAP")) return "AH";
    if (m.includes("OU") || lab.includes("OVER") || lab.includes("UNDER")) return "OU";
    if (m.includes("DC") || lab.includes("DOBLE OPORTUNIDAD") || lab.includes("1X") || lab.includes("X2") || lab.includes("12")) return "DC";
    if (m.includes("BTTS") || m.includes("BTS") || (lab.includes("AMBOS") && (lab.includes("MARCAN") || lab.includes("ANOTAN")))) {
      if (lab.includes("NO")) return "BTTS_NO";
      return "BTTS_YES";
    }
    return "OTHER";
  };

  const legOdd = (c) => {
    const o = Number(c?.usedOdd ?? c?.marketOdd ?? c?.odd ?? c?.fvOdd);
    return Number.isFinite(o) ? o : NaN;
  };

  const legProb = (c) => {
    const p = Number(c?.prob ?? c?.probFV ?? c?.p);
    return Number.isFinite(p) ? p : 0;
  };

  // Candidatos por fixture, priorizando: datos completos, prob alta, cuota baja
  const perFixtureBest = fixtures.map(([fid, arr]) => {
    const list = (arr || [])
      .map((c) => ({ ...c, fixtureId: c?.fixtureId ?? fid }))
      .filter((c) => {
        const o = legOdd(c);
        return Number.isFinite(o) && o >= (Number(minOdd) || 1.01) && o <= HARD_MAX_LEG;
      })
      .sort((a, b) => {
        const aFull = (a?.dataQuality === "full" || a?.dataQuality === "complete") ? 1 : 0;
        const bFull = (b?.dataQuality === "full" || b?.dataQuality === "complete") ? 1 : 0;
        if (aFull !== bFull) return bFull - aFull;
        if (legProb(a) !== legProb(b)) return legProb(b) - legProb(a);
        return legOdd(a) - legOdd(b);
      });

    return { fixtureId: fid, isFull: isFullFixture(arr), list };
  });

  // Orden: primero los datos completos, luego prob, luego cuota
  perFixtureBest.sort((A, B) => {
    if (A.isFull !== B.isFull) return (B.isFull ? 1 : 0) - (A.isFull ? 1 : 0);
    const a = A.list[0], b = B.list[0];
    if (!a && b) return 1;
    if (a && !b) return -1;
    if (!a && !b) return 0;
    if (legProb(a) !== legProb(b)) return legProb(b) - legProb(a);
    return legOdd(a) - legOdd(b);
  });

  const legs = [];
  const usedFixtures = new Set();
  let total = 1;

  // límites por tipo para evitar "siempre lo mismo"
  let bttsCount = 0;
  let bttsNoCount = 0;
  const catCount = { AH: 0, OU: 0, DC: 0, BTTS_NO: 0, BTTS_YES: 0, OTHER: 0 };

  const canUse = (c) => {
    const fid = String(c?.fixtureId ?? "");
    if (!fid || usedFixtures.has(fid)) return false;

    const o = legOdd(c);
    if (!Number.isFinite(o) || o <= 1 || o > HARD_MAX_LEG) return false;

    const next = total * o;
    if (next > HARD_MAX_TOTAL * 1.03) return false;

    const cat = catOf(c);
    // BTTS máximo 1; BTTS_NO máximo 1 (y preferimos NO lo mínimo)
    if ((cat === "BTTS_NO" || cat === "BTTS_YES") && bttsCount >= 1) return false;
    if (cat === "BTTS_NO" && bttsNoCount >= 1) return false;

    // Por estética: no más de 2 del mismo tipo cuando hay 3-4 legs
    if (minLegs >= 3 && catCount[cat] >= 2) return false;

    return true;
  };

  const score = (c) => {
    const cat = catOf(c);
    const p = legProb(c);
    const o = legOdd(c);

    // penalizar repetir el mismo tipo que el último gift
    const rotatePenalty = (_fv_lastGiftCat && cat === _fv_lastGiftCat) ? 0.06 : 0;

    // bonus por datos completos
    const fullBonus = (c?.dataQuality === "full" || c?.dataQuality === "complete") ? 0.05 : 0;

    // penalizar BTTS_NO para que NO domine
    const bttsNoPenalty = (cat === "BTTS_NO") ? 0.08 : 0;

    // preferimos cuotas bajas (más seguro)
    const oddPenalty = Math.max(0, o - 1.60) * 0.04;

    return (p + fullBonus) - rotatePenalty - bttsNoPenalty - oddPenalty;
  };

  // construir legs (1 o 3-4)
  for (const fx of perFixtureBest) {
    if (legs.length >= maxLegs) break;
    const best = (fx.list || []).slice(0, 6) // top N por fixture
      .sort((a, b) => score(b) - score(a))
      .find(canUse);

    if (!best) continue;

    legs.push(best);
    usedFixtures.add(String(best.fixtureId));
    const cat = catOf(best);
    catCount[cat] = (catCount[cat] || 0) + 1;

    if (cat === "BTTS_NO") { bttsCount += 1; bttsNoCount += 1; }
    else if (cat === "BTTS_YES") { bttsCount += 1; }

    total *= legOdd(best);
  }

  // Si no logramos el mínimo (por la barrera de cuota total), degradamos: dejamos 1 pick seguro.
  if (legs.length < minLegs) {
    const fallback = perFixtureBest
      .flatMap((fx) => fx.list.slice(0, 4))
      .sort((a, b) => score(b) - score(a))
      .find((c) => {
        const o = legOdd(c);
        return Number.isFinite(o) && o > 1 && o <= HARD_MAX_LEG;
      });

    return { legs: fallback ? [fallback] : [] };
  }

  // Registrar último tipo para rotación
  _fv_lastGiftCat = catOf(legs[0] || legs[legs.length - 1]);

  return { legs };
}

export function buildParlay(candidatesByFixture, target, opts = {}) {
  const t = Number(target);

  // Flatten candidates
  const byFix = candidatesByFixture || {};
  const candAll = Object.values(byFix).flat().filter(Boolean);

  const poolFixtures = Object.keys(byFix).length;

  
// Caps: cuando hay MUCHOS fixtures, bajamos el tope de cuota por pick para forzar más legs (más seguro).
const CAP_MAX_NORMAL = 2.7;   // pools chicos (1 día con pocos partidos)
const CAP_MAX_STRICT = 2.25;  // pools grandes (>=19 fixtures)
const CAP_MAX_VERY_STRICT = 2.15; // pools muy grandes (>=31 fixtures)

const capLegOdd =
  poolFixtures >= 31 ? CAP_MAX_VERY_STRICT :
  poolFixtures >= 19 ? CAP_MAX_STRICT :
  CAP_MAX_NORMAL;

const HARD_MAX_ODD = 3.0; // nunca pasar 3.0

  const MAX_BTTS_PER_PARLAY = 1;
  const MAX_OU_PER_PARLAY = 3;
  const MAX_AH_PER_PARLAY = 3;

  const safeNum = (x, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

  const getFixtureId = (c) => {
    const v =
      c?.fixtureId ??
      c?.fixture?.fixture?.id ??
      c?.fixture?.id ??
      c?.fixture?.fixture_id ??
      c?.id;
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : (v != null ? String(v) : "");
  };

  const marketKey = (c) => String(c?.market ?? c?.type ?? "").toUpperCase();

  const bucket = (c) => {
    const m = marketKey(c);
    const lab = String(c?.label ?? "").toUpperCase();

    // ---- BTTS (Ambos marcan) ----
    if (m.includes("BTTS") || lab.includes("AMBOS")) {
      // Normalizamos: "NO" / "SI"
      if (lab.includes("NO")) return "BTTS_NO";
      return "BTTS_YES";
    }

    // ---- Handicap ----
    if (m === "AH" || lab.includes("HÁNDICAP") || lab.includes("HANDICAP")) return "AH";

    // ---- Totales (Over/Under) ----
    if (m === "OU" || lab.includes("OVER") || lab.includes("UNDER")) return "OU";

    // ---- Doble oportunidad ----
    if (m.includes("DC") || lab.includes("DOBLE")) return "DC";

    return "OTHER";
  };

  const pr = (c) => safeNum(c?.probFV, safeNum(c?.prob, 0));
  const odd = (c) => safeNum(c?.usedOdd, safeNum(c?.odd, safeNum(c?.useodd, safeNum(c?.usedodd, NaN))));

  // score: probability first, then lower odds (more conservative)
  const score = (c) => pr(c) * 1000 - odd(c);

  // Filter invalid odds
  let pool = candAll
    .filter((c) => Number.isFinite(odd(c)) && odd(c) > 1)
    .filter((c) => pr(c) >= safeNum(opts.minProb, 0));

  if (!pool.length) return null;

  // Conservative: avoid >3 always.
  pool = pool.filter((c) => odd(c) <= 3);

  // Sort best-first
  pool.sort((a, b) => score(b) - score(a));

  const minLegsForTarget = () => {
    if (poolFixtures > 18) {
      if (t >= 100) return 9;
      if (t >= 50) return 8;
      if (t >= 20) return 7;
      return 6;
    }
    if (poolFixtures > 10) {
      if (t >= 100) return 8;
      if (t >= 50) return 7;
      if (t >= 20) return 6;
      return 5;
    }
    if (t >= 100) return 7;
    if (t >= 50) return 6;
    if (t >= 20) return 5;
    return 4;
  };

  const maxLegsForTarget = () => {
    if (poolFixtures > 18) {
      if (t >= 100) return 10;
      if (t >= 50) return 9;
      if (t >= 20) return 8;
      return 7;
    }
    if (poolFixtures > 10) {
      if (t >= 100) return 9;
      if (t >= 50) return 8;
      if (t >= 20) return 7;
      return 6;
    }
    if (t >= 100) return 8;
    if (t >= 50) return 7;
    if (t >= 20) return 6;
    return 5;
  };

  const minLegs = Math.min(minLegsForTarget(), poolFixtures || minLegsForTarget());
  const maxLegs = Math.min(maxLegsForTarget(), poolFixtures || maxLegsForTarget());

  const chosen = [];
  let prod = 1;

  let bttsCount = 0; // total BTTS picks
  let bttsNoCount = 0; // BTTS NO (max 1)
  let bttsYesCount = 0; // BTTS YES (max 1)
  let ouCount = 0;
  let ahCount = 0;

  const usedFix = new Set();

  const canTake = (c) => {
    const fx = getFixtureId(c);
    if (!fx) return false;
    if (usedFix.has(fx)) return false;

    const o = odd(c);
    if (!Number.isFinite(o) || o <= 1) return false;

    // keep legs conservative; allow small slack when reaching target
    if (o > capLegOdd && prod < t) return false;

    const b = bucket(c);

    const bttsInfo = isBTTSLike(c);
if (bttsInfo.is && bttsCount >= maxBTTS) return false;
if (bttsInfo.isNo && bttsNoCount >= maxBTTSNO) return false;

    // Soft limits (diversidad)
    if ((b === "BTTS_YES" || b === "BTTS") && bttsCount >= 1) return false;
    if (b === "OU" && ouCount >= MAX_OU_PER_PARLAY) return false;
    if (b === "AH" && ahCount >= MAX_AH_PER_PARLAY) return false;

    return true;
  };

  const add = (c) => {
    chosen.push(c);
    prod *= odd(c);

    const fx = getFixtureId(c);
    usedFix.add(fx);

    
const b = bucket(c);
const bi = isBTTSLike(c);
if (bi.is) bttsCount += 1;
if (bi.isNo) bttsNoCount += 1;
if (bi.is && !bi.isNo) bttsYesCount += 1;if (b === "OU") ouCount += 1;
    if (b === "AH") ahCount += 1;
  };

  // --- Variety pass: try to include at least 1 OU and 1 AH when available ---
  const bestOf = (b) => pool.find((c) => bucket(c) === b && canTake(c));
  const wantOU = bestOf("OU");
  if (wantOU) add(wantOU);

  const wantAH = bestOf("AH");
  if (wantAH) add(wantAH);

  
// If BTTS candidates exist, include at most ONE (prefer BTTS YES over NO when similar)
if (safeNum(opts.allowBtts, 1) === 1) {
  const bestNo = pool.find((c) => bucket(c) === "BTTS_NO" && canTake(c));
  const bestYes = pool.find((c) => bucket(c) === "BTTS_YES" && canTake(c));
  const pickBTTS =
    bestYes && bestNo
      ? (pr(bestYes) > pr(bestNo) ? bestYes : (pr(bestNo) > pr(bestYes) ? bestNo : bestYes))
      : (bestYes || bestNo);
  if (pickBTTS) add(pickBTTS);
}// Fill remaining legs greedily
  for (const c of pool) {
    if (chosen.length >= maxLegs) break;
    if (!canTake(c)) continue;

    const next = prod * odd(c);
    // If we still need to hit target, accept; else accept only if doesn't overshoot too much.
    if (chosen.length < minLegs) {
      add(c);
      continue;
    }

    if (prod < t) {
      add(c);
      continue;
    }

    // already >= target; only add if it improves stability (higher prob, lower odd) and not huge.
    if (next <= prod * 1.2) add(c);
  }

  // If not enough legs selected (e.g., tight constraints), relax capLegOdd slightly up to 3
  if (chosen.length < minLegs) {
    for (const c of pool) {
      if (chosen.length >= minLegs) break;
      const fx = getFixtureId(c);
      if (!fx || usedFix.has(fx)) continue;

      const o = odd(c);
      if (!Number.isFinite(o) || o <= 1 || o > 3) continue;

      const b = bucket(c);
      if (b === "BTTS" && bttsCount >= MAX_BTTS_PER_PARLAY) continue;
      if (b === "OU" && ouCount >= MAX_OU_PER_PARLAY) continue;
      if (b === "AH" && ahCount >= MAX_AH_PER_PARLAY) continue;

      add(c);
    }
  }

  if (!chosen.length) return null;

  // Final: ensure min legs, else null
  if (chosen.length < Math.min(minLegs, poolFixtures || minLegs)) return null;

  // Normalize legs output (keep original cand shape; Comparator expects label/fixture names etc)
  return {
    target: t,
    finalOdd: Number(prod.toFixed(2)),
    legsCount: chosen.length,
    legs: chosen,
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