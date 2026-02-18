// src/lib/fvModel.js
// Motor MVP de probabilidades + armado de parlays para Factor Victoria.
// Objetivo: simple, interpretable, con fallbacks (si no hay odds o stats).

function clamp01(x) {
  if (typeof x !== "number" || Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

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
  const under15_h = probUnderFromAvgGoals(usableTotal, 1.5);

  // fallback: si heurística da null, usa Poisson
  const under35 = under35_h ?? probUnderLine(lambdaTotal, 3.5);
  const under25 = under25_h ?? probUnderLine(lambdaTotal, 2.5);
  const under15 = under15_h ?? probUnderLine(lambdaTotal, 1.5);

  const over25 = clamp(1 - under25, 0.01, 0.99);
  const over15 = clamp(1 - under15, 0.01, 0.99);

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

export function buildParlay({ candidatesByFixture, target, cap, maxLegs = 15 }) {
  // Parlay builder: diversifica (1 pick por fixture), evita contradicciones y escala legs según tamaño del pool.
  const fixtureIds = Object.keys(candidatesByFixture || {});
  const poolSize = fixtureIds.length;

  const t = Number(target) || 0;
  const effectiveTarget = t > 0 ? t : 10;

  // Hints base por target (ajustables por poolSize)
  let minHint = effectiveTarget <= 20 ? 5 : (effectiveTarget <= 50 ? 7 : 9);
  let maxHint = effectiveTarget <= 20 ? 7 : (effectiveTarget <= 50 ? 9 : 15);

  // Si el pool es pequeño, baja hints para que siempre pueda generar.
  if (poolSize <= 6) { minHint = 2; maxHint = Math.min(6, maxHint); }
  else if (poolSize <= 10) { minHint = Math.min(minHint, 4); maxHint = Math.min(maxHint, 8); }
  else if (poolSize >= 20) {
    // pool grande => más legs (más conservador) sin ser infinito
    if (effectiveTarget >= 100) { minHint = Math.max(minHint, 9); maxHint = Math.max(maxHint, 12); }
    if (effectiveTarget >= 50 && effectiveTarget < 100) { minHint = Math.max(minHint, 8); }
    if (effectiveTarget <= 20) { minHint = Math.max(minHint, 6); }
  }

  // Límites efectivos (nunca más que poolSize)
  let maxLegsEff = Math.min(Number(maxLegs) || 15, maxHint, poolSize);
  let minLegsEff = Math.min(minHint, maxLegsEff);

  // Cap por leg: si hay pool grande, cap más estricto (evita cuotas “por cumplir”)
  const hardCap = typeof cap === "number" ? cap : 3.0;
  let legOddCap = poolSize >= 15 ? Math.min(hardCap, 3.0) : Math.min(Math.max(hardCap, 3.0), 3.5);

  // Overshoot permitido por target (x50 no debe irse a x90)
  const overshootCap =
    effectiveTarget <= 20 ? 1.35 :
    effectiveTarget <= 50 ? 1.20 :
    1.30;

  const perTypeLimitBase = { DC: 3, OU: 3, BTTS: 1, OTHER: 2 };
  const typeBucket = (c) => {
    const ty = (c?.type || "").toUpperCase();
    if (ty === "DC") return "DC";
    if (ty === "OU") return "OU";
    if (ty === "BTTS") return "BTTS";
    return "OTHER";
  };

  // Candidatos por fixture pre-ordenados por "calidad" base
  const listByFix = fixtureIds.map((fid) => {
    const arr = Array.isArray(candidatesByFixture[fid]) ? candidatesByFixture[fid] : [];
    // filtra odds inválidos y respeta cap
    const filtered = arr
      .filter((c) => Number.isFinite(c?.usedOdd ?? c?.odd))
      .map((c) => ({ ...c, _odd: Number(c.usedOdd ?? c.odd) }))
      .filter((c) => c._odd >= 1.01);
    // orden base: score desc, dataQuality full primero, odd asc para seguridad
    filtered.sort((a, b) => {
      const qa = a.dataQuality === "full" ? 1 : 0;
      const qb = b.dataQuality === "full" ? 1 : 0;
      if (qa !== qb) return qb - qa;
      const sa = Number(a.score ?? 0);
      const sb = Number(b.score ?? 0);
      if (sa !== sb) return sb - sa;
      return a._odd - b._odd;
    });
    return { fid, arr: filtered };
  });

  // selección greedy con penalización por desviarse del "log budget"
  const usedFixture = new Set();
  const typeCount = { DC: 0, OU: 0, BTTS: 0, OTHER: 0 };
  const legs = [];
  let prod = 1;

  const pickScore = (cand, remainingLegSlots) => {
    const odd = cand._odd;
    if (odd > legOddCap) return -1e9;

    const bucket = typeBucket(cand);
    if ((typeCount[bucket] ?? 0) >= (perTypeLimitBase[bucket] ?? 99)) return -1e9;

    const base = Number(cand.score ?? 0)
      + (cand.dataQuality === "full" ? 0.6 : (cand.dataQuality === "partial" ? 0.15 : 0))
      + clamp01(Number(cand.prob ?? 0.5)) * 0.8;

    // Preferir odds más bajas (más probables) y evitar picos sobre 3
    const riskPenalty = 0.55 * Math.max(0, odd - 1) + (odd > 2.8 ? 0.35 : 0);

    // Budget por log(target)
    const remainingBudget = Math.log(Math.max(1.0001, effectiveTarget)) - Math.log(Math.max(1.0001, prod));
    const idealLog = remainingBudget / Math.max(1, remainingLegSlots);
    const budgetPenalty = 0.55 * Math.abs(Math.log(odd) - idealLog);

    // No pasarse demasiado (especialmente en x50)
    const nextProd = prod * odd;
    const overshootPenalty = nextProd > effectiveTarget * overshootCap ? 2.0 : 0;

    return base - riskPenalty - budgetPenalty - overshootPenalty;
  };

  // si el pool es grande, intentamos “forzar” más legs (con odds moderadas)
  while (legs.length < maxLegsEff) {
    const remainingSlots = maxLegsEff - legs.length;

    let best = null;
    let bestS = -1e18;

    for (const { fid, arr } of listByFix) {
      if (usedFixture.has(fid) || !arr.length) continue;

      // Sólo evalúa top-N por performance
      const topN = Math.min(arr.length, 6);
      for (let i = 0; i < topN; i++) {
        const c = arr[i];
        const s = pickScore(c, remainingSlots);
        if (s > bestS) { bestS = s; best = { fid, c }; }
      }
    }

    // Si no hay candidato que cumpla cap, relaja un poco (hasta 3.5) como último recurso
    if (!best) {
      if (legOddCap < 3.5) { legOddCap = 3.5; continue; }
      break;
    }

    const cand = best.c;
    const odd = cand._odd;
    const bucket = typeBucket(cand);

    // Aplicar pick
    usedFixture.add(best.fid);
    typeCount[bucket] = (typeCount[bucket] ?? 0) + 1;

    prod *= odd;
    legs.push({
      fixtureId: cand.fixtureId ?? best.fid,
      marketKey: cand.key,
      label: cand.label,
      odd: round2(odd),
      prob: round2(cand.prob),
      type: cand.type,
      dataQuality: cand.dataQuality,
    });

    // Condiciones de salida:
    // - antes de min legs: sigue aunque ya llegaste (queremos parlay “más normal” con pool grande)
    if (legs.length >= minLegsEff) {
      if (prod >= effectiveTarget && prod <= effectiveTarget * overshootCap) break;
      // si ya te pasaste mucho, corta igual (mejor que seguir empeorando)
      if (prod > effectiveTarget * overshootCap) break;
      // si estás cerca (>=90%) y el siguiente salto probable te pasaría, corta.
      if (prod >= effectiveTarget * 0.90 && legs.length >= minLegsEff + 1) break;
    }
  }

  // Fallback: si quedó muy bajo, intenta agregar legs “baratas” (odds bajas) para acercarse
  if (prod < effectiveTarget * 0.85 && legs.length < poolSize) {
    // busca más fixtures con odds bajas, ignorando score
    const remaining = listByFix
      .filter(({ fid }) => !usedFixture.has(fid))
      .map(({ fid, arr }) => ({ fid, best: arr.slice().sort((a, b) => a._odd - b._odd)[0] }))
      .filter((x) => x.best && x.best._odd <= Math.max(legOddCap, 2.2))
      .sort((a, b) => a.best._odd - b.best._odd);

    for (const r of remaining) {
      if (legs.length >= maxLegsEff) break;
      const c = r.best;
      const bucket = typeBucket(c);
      if ((typeCount[bucket] ?? 0) >= (perTypeLimitBase[bucket] ?? 99)) continue;

      usedFixture.add(r.fid);
      typeCount[bucket] = (typeCount[bucket] ?? 0) + 1;
      prod *= c._odd;

      legs.push({
        fixtureId: c.fixtureId ?? r.fid,
        marketKey: c.key,
        label: c.label,
        odd: round2(c._odd),
        prob: round2(c.prob),
        type: c.type,
        dataQuality: c.dataQuality,
      });

      if (legs.length >= minLegsEff && prod >= effectiveTarget * 0.90) break;
    }
  }

  return {
    target: effectiveTarget,
    cap: legOddCap,
    games: legs.length,
    finalOdd: round2(prod),
    impliedProb: round2(1 / prod),
    legs,
    picks: legs,
    reached: prod >= effectiveTarget * 0.90,
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
