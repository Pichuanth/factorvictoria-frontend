// fvModel patch marker v7
  function isUnder25Pick(c) {
    const m = String(c?.market ?? c?.type ?? "").toUpperCase();
    const lab = String(c?.label ?? "").toUpperCase();
    return m.includes("UNDER_25") || m.includes("U25") || lab.includes("UNDER 2.5") || lab.includes("U2.5");
  }

  function isBttsNo(c) {
    const m = String(c?.market ?? c?.type ?? "").toUpperCase();
    const lab = String(c?.label ?? "").toUpperCase();
    const sel = String(c?.selection ?? c?.pick ?? c?.outcome ?? "").toUpperCase();
    const isBTTS = m.includes("BTTS") || lab.includes("AMBOS");
    if (!isBTTS) return false;
    // Identificamos específicamente "Ambos marcan: NO"
    return sel.includes("NO") || lab.includes("NO");
  }

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
      usedOdd: round2(1 / (clamp(pAhH3, 0.01, 0.999) + 0.04)),
      dataQuality,
      marketOdd: round2(1 / (clamp(pAhH3, 0.01, 0.999) + 0.04)),
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
      usedOdd: round2(1 / (clamp(pAhA3, 0.01, 0.999) + 0.04)),
      dataQuality,
      marketOdd: round2(1 / (clamp(pAhA3, 0.01, 0.999) + 0.04)),
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
      marketOdd: markets?.OU_05?.over ?? markets?.OU_05?.o ?? null,
      usedOdd: (markets?.OU_05?.over ?? markets?.OU_05?.o ?? null) ?? round2(1 / (clamp(pOver05, 0.01, 0.999) + 0.03)),
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
let __fv_lastGiftCat = null;


// Categoría de pick (para controlar diversidad y evitar repetición excesiva de un mismo mercado)
function getPickCategory(p) {
  const m = String(p?.market || "").toUpperCase();
  const lbl = String(p?.label || p?.name || p?.pick || "").toUpperCase();

  if (m.includes("BTTS") || lbl.includes("AMBOS")) return "BTTS";
  if (m === "DC" || m.includes("DOUBLE") || lbl.includes("DOBLE OPORTUNIDAD")) return "DC";
  if (m === "AH" || lbl.includes("HANDICAP")) return "AH";
  if (m === "OU" || lbl.includes("OVER") || lbl.includes("UNDER") || m.includes("OVER") || m.includes("UNDER")) return "OU";
  if (m === "1X2" || lbl.includes("1X2") || lbl.includes("GANADOR")) return "1X2";

  return m || (lbl ? lbl.split(/\s+/)[0] : "OTHER");
}

// Helper compacto para el último pick del regalo (legacy)
function _cat(p) {
  return getPickCategory(p);
}

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

export function buildGiftPickBundle(
  candidatesByFixture,
  { minOdd = 1.08, maxOdd = 2.2, probMin = 0.75 } = {}
) {
  try {
    const pool = [];
    for (const [fixtureId, candList] of Object.entries(candidatesByFixture || {})) {
      for (const c of candList || []) {
        const o = __fv_legOdd(c);
        if (!Number.isFinite(o)) continue;
        if (o < minOdd || o > maxOdd) continue;
        const p = Number(c?.prob ?? 0);
        if (p < probMin) continue;
        pool.push({
          ...c,
          fixtureId: c.fixtureId ?? fixtureId,
          __fv_legOdd: o,
          fixtureFull: !!c.fixtureFull,
        });
      }
    }

    if (!pool.length) return null;

    const poolFull = pool.filter((c) => c.fixtureFull);
    const pickFrom = poolFull.length ? poolFull : pool;

    // Prefer "datos completos" and the highest probability; break ties by lower odds.
    pickFrom.sort((a, b) => {
      if (!!b.fixtureFull !== !!a.fixtureFull) return (b.fixtureFull ? 1 : 0) - (a.fixtureFull ? 1 : 0);
      const pa = Number(a.prob ?? 0);
      const pb = Number(b.prob ?? 0);
      if (pb !== pa) return pb - pa;
      return Number(a.__fv_legOdd) - Number(b.__fv_legOdd);
    });

    const best = pickFrom[0];
    const o = round2(Number(best.__fv_legOdd));

    return {
      legs: [
        {
          ...best,
          marketOdd: o,
          usedOdd: o,
          displayOdd: o,
          odds: o,
        },
      ],
      finalOdd: o,
      prob: Number(best.prob ?? 0),
      fixtureFull: !!best.fixtureFull,
    };
  } catch {
    return null;
  }
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
          if (isBTTSNO(c) && bttsNoCount >= MAX_BTTSNO_PER_PARLAY) continue;
          addCand(c);
          return true;
        }
        return false;
      };

      if (hasAnyOU) pickOne(isOU);
      if (hasAnyAH) pickOne(isAH);
    }
}

// -----------------------------
// Parlay builder (exported)
// Deterministic, tries to get close to target without using single odds above hardMaxOdd.
// candidatesByFixture: { [fixtureId]: CandidatePick[] }
// CandidatePick should include: fixtureId, marketOdd (or fvOdd), prob, dataQuality ('complete'|'partial'), market, selection.
// Returns: { target, legs, finalOdd }
export function buildParlay({ candidatesByFixture, target, cap = 100, hardMaxOdd = 2.5, minLegs = 0, mustIncludeFixtures = [] }) {
  try {
    const byFix = candidatesByFixture || {};
    const fixtureIds = Object.keys(byFix);

    if (!fixtureIds.length) return null;

    // Helper: candidate odd used for parlay multiplication / display
    const candOdd = (c) => {
      const o = Number(c?.marketOdd ?? c?.odd ?? c?.fvOdd ?? c?.usedOdd);
      return Number.isFinite(o) && o > 1 ? o : null;
    };

    const qualityBonus = (c) => {
      const q = String(c?.dataQuality || "").toLowerCase();
      if (q === "complete" || q === "completo" || q === "datos completos") return 1.0;
      if (q === "partial" || q === "parcial" || q === "datos parciales") return 0.6;
      return 0.4;
    };

    const probScore = (c) => {
      const p = Number(c?.prob ?? c?.p ?? c?.probability);
      return Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
    };

    const usable = (c) => {
      const o = candOdd(c);
      return o && o <= hardMaxOdd;
    };

    const bestForFixture = (fixtureId, preferLow = false) => {
      const arr = Array.isArray(byFix[fixtureId]) ? byFix[fixtureId] : [];
      const filtered = arr.filter(usable);
      if (!filtered.length) return null;

      // Score: prioritize dataComplete + high prob. Optionally prefer lower odds for small targets.
      filtered.sort((a, b) => {
        const oa = candOdd(a) || 999;
        const ob = candOdd(b) || 999;
        const sa = (probScore(a) * 1.2 + qualityBonus(a)) - (preferLow ? oa * 0.15 : 0);
        const sb = (probScore(b) * 1.2 + qualityBonus(b)) - (preferLow ? ob * 0.15 : 0);
        if (sb !== sa) return sb - sa;
        return preferLow ? (oa - ob) : (ob - oa);
      });

      // Keep top-3 diversity
      return filtered.slice(0, 3);
    };

    const usedFixtures = new Set();
    const legs = [];
    let prod = 1;

    // Market repetition caps (per parlay)
    let under25Count = 0;
    let bttsNoCount = 0;
    const bumpAdd = (p) => {
      if (isUnder25Pick(p)) under25Count += 1;
      if (isBttsNo(p)) bttsNoCount += 1;
    };
    const bumpRemove = (p) => {
      if (isUnder25Pick(p)) under25Count = Math.max(0, under25Count - 1);
      if (isBttsNo(p)) bttsNoCount = Math.max(0, bttsNoCount - 1);
    };


    // 1) Forced fixtures first (selected mode)
    for (const fid of mustIncludeFixtures || []) {
      if (!fid || usedFixtures.has(String(fid))) continue;
      const opts = bestForFixture(String(fid), true);
      if (!opts?.length) continue;
      const pick = opts[0];
      const o = candOdd(pick);
      if (!o) continue;
      legs.push(pick);
      usedFixtures.add(String(fid));
      prod *= o;
    }

    // If already too high above cap, stop early
    if (prod > cap) {
      return { target, legs, finalOdd: round2(prod) };
    }

    // 2) Greedy "closest to target" selection
    const logT = Math.log(Math.max(1.0001, target || 1));
    const maxLegs = 12;

    // Precompute candidate options per fixture
    const options = {};
    for (const fid of fixtureIds) {
      if (usedFixtures.has(fid)) continue;
      const preferLow = (target || 1) <= 5;
      const opts = bestForFixture(fid, preferLow);
      if (opts?.length) options[fid] = opts;
    }

    const remaining = () => Object.keys(options).filter((fid) => !usedFixtures.has(fid));

    while (legs.length < maxLegs && (prod < (target || 1) * 0.99 || legs.length < minLegs)) {
      const candFids = remaining();
      if (!candFids.length) break;

      let best = null;
      let bestScore = Infinity;

      for (const fid of candFids) {
        const opts = options[fid] || [];
        for (const c of opts) {
          // Cap repeated markets inside a single parlay
          if (isUnder25Pick(c) && under25Count >= 1) continue;
          if (isBttsNo(c) && bttsNoCount >= 1) continue;
          const o = candOdd(c);
          if (!o) continue;
          const next = prod * o;

          // Objective: closeness in log-space to target + penalty if overshoot too much for small targets.
          const logErr = Math.abs(Math.log(next) - logT);

          const overshoot = next > (target || 1) ? (next / (target || 1)) : 1;
          const overshootPenalty = (target || 1) <= 5 ? Math.max(0, overshoot - 1) * 0.8 : Math.max(0, overshoot - 1) * 0.25;

          // Prefer complete data + higher prob
          const qualityPen = (1.1 - qualityBonus(c)) * 0.9;
          const probPen = (1 - probScore(c)) * 0.7;

          // Avoid extremely tiny odds (can make all targets look the same)
          const tinyPenalty = o < 1.08 ? (1.08 - o) * 6 : 0;

          const score = logErr + overshootPenalty + qualityPen + probPen + tinyPenalty;

          if (score < bestScore) {
            bestScore = score;
            best = { fid, pick: c, odd: o };
          }
        }
      }

      if (!best) break;
      legs.push(best.pick);
      bumpAdd(best.pick);
      usedFixtures.add(best.fid);
      prod *= best.odd;

      if (prod > cap) break;
    }

    // 3) If still far from target and we have room, allow a controlled upgrade (slightly higher odd within hardMaxOdd)
    if (prod < (target || 1) * 0.8 && legs.length < maxLegs) {
      const candFids = remaining();
      for (const fid of candFids) {
        const opts = (options[fid] || []).slice().sort((a, b) => (candOdd(b) || 0) - (candOdd(a) || 0));
        const c = opts[0];
        const o = candOdd(c);
        if (!o) continue;
        legs.push(c);
        usedFixtures.add(fid);
        prod *= o;
        if (prod >= (target || 1) * 0.9 || legs.length >= maxLegs) break;
      }
    }

    if (!legs.length) return null;

    // Ensure we don't return identical legs for very close targets (x3/x5) too often:
    // If prod is way above target for small targets, trim highest-odd legs.
    if ((target || 1) <= 5 && prod > (target || 1) * 1.9 && legs.length > 2) {
      // sort by odd desc and pop until closer
      const withOdds = legs.map((p) => ({ p, o: candOdd(p) || 1.01 }));
      withOdds.sort((a, b) => b.o - a.o);
      let tmp = prod;
      const kept = legs.slice();
      for (const it of withOdds) {
        if (kept.length <= 2) break;
        const idx = kept.indexOf(it.p);
        if (idx >= 0) {
          const next = tmp / it.o;
          if (next >= (target || 1) * 0.95) {
            kept.splice(idx, 1);
            tmp = next;
          }
        }
      }
      prod = tmp;
      legs.length = 0;
      legs.push(...kept);
    }

    return { target, legs, finalOdd: round2(prod) };
  } catch (e) {
    console.error("[fvModel] buildParlay error", e);
    return null;
  }
}
