// src/lib/fvModel.js
// Motor MVP de probabilidades + armado de parlays para Factor Victoria.
// Objetivo: simple, interpretable, con fallbacks (si no hay odds o stats).
// FV_BUILD_MARK: 2026-02-19_1234 (cambia el número cada vez)

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

// Over X.5 goals = 1 - P(total <= floor(X.5))
export function probOverLine(a, b, c) {
  /*
   * Backwards compatible signature:
   * - probOverLine(lambdaTotal, line)
   * - probOverLine(lambdaHome, lambdaAway, line)
   */
  const lambdaTotal = (c === undefined) ? a : (Number(a) + Number(b));
  const line = (c === undefined) ? b : c;
  const u = probUnderLine(lambdaTotal, line);
  if (!Number.isFinite(u)) return null;
  return clamp(1 - u, 0, 1);
}

export function probBTTSNo(lambdaHome, lambdaAway) {
  const pH0 = poissonP(0, lambdaHome);
  const pA0 = poissonP(0, lambdaAway);
  const pBoth0 = pH0 * pA0;
  return clamp(pH0 + pA0 - pBoth0, 0, 1);
}

function probHandicapPlus(lambdaHome, lambdaAway, plus, side) {
  // Probability that (side) with +plus Asian handicap does NOT lose by more than 'plus'.
  // side: 'home' => P(homeGoals + plus >= awayGoals)
  // side: 'away' => P(awayGoals + plus >= homeGoals)
  lh = Number.isFinite(lh) ? lh : 1.1;
  la = Number.isFinite(la) ? la : 1.05;
  plus = Number.isFinite(plus) ? plus : 2;
  side = side === "away" ? "away" : "home";

  const lt = lh + la;
  const N = Math.max(10, Math.min(16, Math.ceil(lt * 3)));
  let p = 0;

  const pmfH = [];
  const pmfA = [];
  let sumH = 0, sumA = 0;
  for (let i = 0; i <= N; i++) { const v = poissonPMF(lh, i); pmfH.push(v); sumH += v; }
  for (let j = 0; j <= N; j++) { const v = poissonPMF(la, j); pmfA.push(v); sumA += v; }

  for (let i = 0; i <= N; i++) pmfH[i] = pmfH[i] / (sumH || 1);
  for (let j = 0; j <= N; j++) pmfA[j] = pmfA[j] / (sumA || 1);

  for (let hg = 0; hg <= N; hg++) {
    for (let ag = 0; ag <= N; ag++) {
      const ok = side === "home" ? (hg + plus >= ag) : (ag + plus >= hg);
      if (ok) p += pmfH[hg] * pmfA[ag];
    }
  }
  return clamp01(p);
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
  const cand = out; // alias para compatibilidad (evita "cand is not defined")

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

  // Over 0.5 / 1.5 goals (muy seguros para sumar legs)
  const pOver05 = probOverLine(lambdaHome, lambdaAway, 0.5);
  const oOver05 = fairOddFromProb(pOver05);
  if (oOver05 <= capMax && pOver05 >= 0.70) {
    cand.push({
      fixtureId,
      market: "OU",
      selection: "over0.5",
      label: "Over 0.5 goles",
      prob: pOver05,
      fvOdd: oOver05,
      source: "fv",
      dataQuality,
    });
  }

  const pOver15 = probOverLine(lambdaHome, lambdaAway, 1.5);
  const oOver15 = fairOddFromProb(pOver15);
  if (oOver15 <= capMax && pOver15 >= 0.60) {
    cand.push({
      fixtureId,
      market: "OU",
      selection: "over1.5",
      label: "Over 1.5 goles",
      prob: pOver15,
      fvOdd: oOver15,
      source: "fv",
      dataQuality,
    });
  }

  // Hándicap asiático (+2 / +3) - muy "creíble" para el usuario
  const pH2 = probHandicapPlus(lambdaHome, lambdaAway, 2, "home");
  const oH2 = fairOddFromProb(pH2);
  if (oH2 <= capMax && pH2 >= 0.70) {
    cand.push({
      fixtureId,
      market: "AH",
      selection: "home+2",
      label: "Hándicap +2 (Local)",
      prob: pH2,
      fvOdd: oH2,
      source: "fv",
      dataQuality,
    });
  }
  const pH3 = probHandicapPlus(lambdaHome, lambdaAway, 3, "home");
  const oH3 = fairOddFromProb(pH3);
  if (oH3 <= capMax && pH3 >= 0.78) {
    cand.push({
      fixtureId,
      market: "AH",
      selection: "home+3",
      label: "Hándicap +3 (Local)",
      prob: pH3,
      fvOdd: oH3,
      source: "fv",
      dataQuality,
    });
  }

  const pA2 = probHandicapPlus(lambdaHome, lambdaAway, 2, "away");
  const oA2 = fairOddFromProb(pA2);
  if (oA2 <= capMax && pA2 >= 0.70) {
    cand.push({
      fixtureId,
      market: "AH",
      selection: "away+2",
      label: "Hándicap +2 (Visita)",
      prob: pA2,
      fvOdd: oA2,
      source: "fv",
      dataQuality,
    });
  }
  const pA3 = probHandicapPlus(lambdaHome, lambdaAway, 3, "away");
  const oA3 = fairOddFromProb(pA3);
  if (oA3 <= capMax && pA3 >= 0.78) {
    cand.push({
      fixtureId,
      market: "AH",
      selection: "away+3",
      label: "Hándicap +3 (Visita)",
      prob: pA3,
      fvOdd: oA3,
      source: "fv",
      dataQuality,
    });
  }
  // BTTS NO (limitado por reglas; usa solo si hay soporte estadístico)
  if (typeof bttsNo === "number" && Number.isFinite(bttsNo)) {
    const oBttsNo = fairOddFromProb(bttsNo);
    if (oBttsNo <= capMax && bttsNo >= 0.55) {
      cand.push({
        market: "BTTS",
        selection: "no",
        label: "Ambos marcan: NO",
        prob: bttsNo,
        fvOdd: oBttsNo,
        marketOdd: markets?.BTTS?.no ?? null,
      });
    }
  }

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
  // Penaliza BTTS NO (se usa como condimento, no como base del modelo)
  const isBttsNo = (c.market === "BTTS" && c.selection === "no") || (c.marketKey === "BTTS_NO");
  if (isBttsNo) score -= 0.12;
  // Bonifica mercados conservadores y 'creíbles' para el usuario
  const isHandicapPlus = (c.market === "AH");
  const isOUConservative = (c.market === "OU" && (c.selection === "under3.5" || c.selection === "over0.5" || c.selection === "over1.5"));
  if (isHandicapPlus) score += 0.07;
  if (isOUConservative) score += 0.05;
}


export function buildParlay({ candidatesByFixture, target, cap, maxLegs = 12 }) {
  const t = Number(target);
  const hardCap = Number(cap);

  if (!Number.isFinite(t) || t <= 1) return null;
  if (!Number.isFinite(hardCap) || hardCap <= 1) return null;

  const byFx = candidatesByFixture || {};
  const fixtureIds = Object.keys(byFx);
  const fixtureCount = fixtureIds.length;

  if (!fixtureCount) return null;

  // ----------------------------
  // Dynamic scaling by pool size
  // ----------------------------
  const baseMinProbByTarget = { 3: 0.78, 5: 0.74, 10: 0.70, 20: 0.66, 50: 0.60, 100: 0.55 };
  let minProb = baseMinProbByTarget[t] ?? 0.70;

  // With large pools, we can be stricter (more conservative per-leg).
  if (fixtureCount >= 30) minProb += 0.04;
  else if (fixtureCount >= 20) minProb += 0.03;
  else if (fixtureCount >= 12) minProb += 0.015;

  // Legs bounds (user spec) + pool-based nudges (raise min legs when there are many options).
  const baseLegs = {
    3:  { min: 2,  max: 4 },
    5:  { min: 3,  max: 5 },
    10: { min: 4,  max: 6 },
    20: { min: 5,  max: 7 },   // x20: 5–7
    50: { min: 7,  max: 9 },   // x50: 7–9
    100:{ min: 9,  max: 15 }   // x100: 9–15
  };

  const baseMin = baseLegs[t]?.min ?? 3;
  const baseMax = baseLegs[t]?.max ?? Math.max(6, Number(maxLegs) || 6);

  const poolBoost =
    fixtureCount >= 45 ? 3 :
    fixtureCount >= 35 ? 2 :
    fixtureCount >= 25 ? 1 :
    fixtureCount >= 18 ? 1 : 0;

  // For high tiers, increase min legs with pool size (more diversification).
  let minLegs = baseMin + (t >= 20 ? poolBoost : 0);
  let maxLegsEff = Math.max(baseMax, Number(maxLegs) || baseMax);

  // Keep within the allowed window for each tier
  minLegs = clamp(minLegs, 2, baseMax);
  maxLegsEff = clamp(maxLegsEff, baseMin, baseMax);

  // Can never exceed available fixtures (1 leg per fixture)
  maxLegsEff = Math.min(maxLegsEff, Math.max(2, fixtureCount));
  minLegs = Math.min(minLegs, maxLegsEff);

  // Max odd per leg (avoid 3.5–4.2 "to comply" when pool is large)
  let maxLegOdd = 3.5;
  if (fixtureCount >= 30) maxLegOdd = 2.8;
  else if (fixtureCount >= 20) maxLegOdd = 3.0;
  else if (fixtureCount >= 15) maxLegOdd = 3.0;
  else if (fixtureCount >= 10) maxLegOdd = 3.4;
  else if (fixtureCount >= 6) maxLegOdd = 3.8;

  // Differentiate x50 vs x100: if x50 exists, x100 should aim a bit higher when possible.
  const effectiveTarget =
    t === 100 && __fv_lastParlay50?.finalOdd
      ? Math.max(100, round2(__fv_lastParlay50.finalOdd * 1.03))
      : t;

  // Collect candidates (flatten)
  let candidates = [];
  for (const fx of fixtureIds) {
    const arr = Array.isArray(byFx[fx]) ? byFx[fx] : [];
    for (const c of arr) {
      if (!c) continue;
      const p = pr(c);
      const odd = __fv_legOdd(c);
      if (!Number.isFinite(p) || p <= 0) continue;
      if (!Number.isFinite(odd) || odd <= 1) continue;
      if (p < minProb) continue;
      if (odd > maxLegOdd) continue;

      // Respect the last gift legs to avoid contradictions (same fixture opposite)
      if (__fv_lastGiftLegs?.length && __fv_isContradictoryPick(__fv_lastGiftLegs[0], c)) continue;

      candidates.push(c);
    }
  }

  if (!candidates.length) return null;

  // De-duplicate by (fixtureId, market group) so we don't overweight one fixture/market
  const seenKey = new Set();
  candidates = candidates.filter((c) => {
    const k = `${String(c.fixtureId)}|${String(c.market)}|${String(c.selection)}`;
    if (seenKey.has(k)) return false;
    seenKey.add(k);
    return true;
  });

  // Sort best-first. For high tiers, increase odds weight slightly.
  const oddWeight = t >= 50 ? 0.55 : t >= 20 ? 0.45 : 0.30;
  candidates.sort((a, b) => __fv_legScore(b, oddWeight) - __fv_legScore(a, oddWeight));

  // Build legs
  const legs = [];
  const usedFx = new Set();
  let prod = 1;

  for (const cand of candidates) {
    const fxId = String(cand.fixtureId);
    if (usedFx.has(fxId)) continue;

    // Extra safety: never add a contradictory pick of same fixture vs existing legs
    if (__fv_isContradictoryPick(legs[legs.length - 1], cand)) continue;
    if (__fv_isContradictoryPick(legs[0], cand)) continue;

    const odd = __fv_legOdd(cand);
    const next = prod * odd;

    // Don't blow past plan cap too much. Allow small slack for reaching.
    if (next > hardCap * 1.08) continue;

    legs.push(cand);
    usedFx.add(fxId);
    prod = next;

    // Stop early if we've reached (or close) and have enough legs.
    if (legs.length >= minLegs && prod >= effectiveTarget * 0.98) break;
    if (legs.length >= maxLegsEff) break;
  }

  if (!legs.length) return null;

  // If we reached target but with too few legs (looks too aggressive), add more legs when pool is large.
  if (fixtureCount >= 20 && t >= 20 && legs.length < minLegs) {
    const extra = candidates
      .filter((c) => !usedFx.has(String(c.fixtureId)))
      .filter((c) => __fv_legOdd(c) <= maxLegOdd && __fv_legOdd(c) >= 1.12)
      .sort((a, b) => __fv_legOdd(a) - __fv_legOdd(b)); // add safer odds first
    for (const c of extra) {
      if (legs.length >= minLegs) break;
      const next = prod * __fv_legOdd(c);
      if (next > hardCap * 1.10) continue;
      legs.push(c);
      usedFx.add(String(c.fixtureId));
      prod = next;
    }
  }

  // Track x50 for x100 differentiation
  const out = {
    target: t,
    cap: hardCap,
    games: legs.length,
    finalOdd: round2(prod),
    impliedProb: round2(1 / prod),
    legs,
    picks: legs,
    reached: prod >= effectiveTarget * 0.90,
  };

  if (t === 50) __fv_lastParlay50 = out;

  // Ensure monotonic: x100 must not be below x50
  if (t === 100 && __fv_lastParlay50?.finalOdd && out.finalOdd < __fv_lastParlay50.finalOdd) {
    out.finalOdd = __fv_lastParlay50.finalOdd;
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