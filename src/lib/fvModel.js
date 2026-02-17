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


// --------- Anti-contradicciones (fixture lock) ---------
function normLabel(c) {
  return String(c?.label || c?.pick || "").toLowerCase();
}
function pickLockSignature(c) {
  const t = normLabel(c);
  // SIDE group
  let side = "neutral"; // home | away | neutral
  if (t.includes("doble oportunidad")) {
    if (t.includes("1x")) side = "home";
    else if (t.includes("x2")) side = "away";
    else side = "neutral"; // 12 u otro
  } else if (t.includes("gana local") || t.includes("local") && t.includes("gana")) {
    side = "home";
  } else if (t.includes("gana visita") || t.includes("visit") && t.includes("gana")) {
    side = "away";
  } else if (/(\b1\b)/.test(t) && t.includes("ml")) side = "home";
  else if (/(\b2\b)/.test(t) && t.includes("ml")) side = "away";

  // OU group
  let ou = null; // over | under | null
  if (t.includes("over")) ou = "over";
  if (t.includes("under")) ou = "under";

  // BTTS group
  let btts = null; // yes | no | null
  if (t.includes("ambos") && (t.includes("sí") || t.includes("si"))) btts = "yes";
  if (t.includes("ambos") && t.includes("no")) btts = "no";

  return { side, ou, btts };
}
function isCompatibleLock(sig, lock) {
  // Side: allow neutral with anything; home vs away conflicts
  if (lock?.side && sig?.side) {
    if (lock.side !== "neutral" && sig.side !== "neutral" && lock.side !== sig.side) return false;
  }
  // OU: over vs under conflicts if both defined
  if (lock?.ou && sig?.ou && lock.ou !== sig.ou) return false;
  // BTTS: yes vs no conflicts if both defined
  if (lock?.btts && sig?.btts && lock.btts !== sig.btts) return false;
  return true;
}


export function pickSafe(candidatesByFixture) {
  // Pick con mayor probabilidad; aplica bloqueo anti-contradicciones para ese fixture
  // mutando candidatesByFixture[fixtureId] (marca __blockedGlobal en picks incompatibles).
  const all = Object.values(candidatesByFixture || {}).flat();
  if (!all.length) return null;

  // preferimos full data
  const score = (c) => {
    const p = Number(c?.prob);
    const q = c?.dataQuality === "full" ? 1 : 0.85;
    const odd = Number(c?.usedOdd) || Number(c?.marketOdd) || Number(c?.fvOdd) || 1.0;
    // ligeramente preferir odds razonables para no clavar picks 1.01
    const oddPen = odd < 1.12 ? 0.85 : 1;
    return (Number.isFinite(p) ? p : 0) * q * oddPen;
  };

  const best = all
    .filter((c) => Number.isFinite(Number(c?.prob)))
    .sort((a, b) => score(b) - score(a))[0] || null;

  if (!best) return null;

  // bloqueo por fixture: misma "dirección" (home/away) y misma familia OU / BTTS
  const fxId = Number(best.fixtureId);
  if (fxId && candidatesByFixture?.[fxId]) {
    const lock = pickLockSignature(best);
    for (const c of candidatesByFixture[fxId]) {
      const sig = pickLockSignature(c);
      if (!isCompatibleLock(sig, lock)) {
        c.__blockedGlobal = true;
      }
      c.__lock = lock;
    }
  }

  return best;
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


export function buildParlay({ candidatesByFixture, target = 3, cap = 100, maxLegs = 12 } = {}) {
  const byFx = candidatesByFixture || {};
  const fxIds = Object.keys(byFx || {}).map((k) => Number(k)).filter((n) => Number.isFinite(n));
  const all = fxIds.flatMap((id) => (byFx[id] || []).map((c) => ({ ...c, fixtureId: Number(c.fixtureId || id) })));

  const toOdd = (c) => {
    const o = Number(c?.usedOdd ?? c?.marketOdd ?? c?.fvOdd);
    return Number.isFinite(o) && o > 1 ? o : null;
  };
  const toProb = (c) => {
    const p = Number(c?.prob);
    return Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : null;
  };

  const T = Number(target) || 3;
  const C = Number(cap) || 100;
  const CAP = Math.max(1, C);

  // minProb dinámico por target (más agresivo cuando target es alto)
  const minProbForTarget = (t) => {
    if (t >= 100) return 0.55;
    if (t >= 50) return 0.60;
    if (t >= 20) return 0.66;
    if (t >= 10) return 0.70;
    if (t >= 5) return 0.74;
    return 0.78;
  };

  const minProb = minProbForTarget(T);

  // Legs mínimos (escala real)
  const minLegsForTarget = (t) => {
    if (t >= 100) return 10;
    if (t >= 50) return 8;
    if (t >= 20) return 5;
    if (t >= 10) return 4;
    if (t >= 5) return 3;
    return 2;
  };
  const minLegs = Math.min(maxLegs, minLegsForTarget(T));

  // selector weight: para targets altos, priorizar odds
  const wOdd = T >= 50 ? 0.75 : T >= 20 ? 0.62 : T >= 10 ? 0.52 : 0.40;

  const isBlocked = (c) => c?.__blockedGlobal === true || c?.blocked === true;

  // Booster: permite mercados más agresivos (pero nunca contradictorio)
  const isAggressiveMarket = (c) => {
    const t = normLabel(c);
    if (t.includes("over 2.5") || t.includes("over 3.5")) return true;
    if (t.includes("ambos") && (t.includes("sí") || t.includes("si"))) return true;
    if (t.includes("gana") && (t.includes("local") || t.includes("visita"))) return true;
    if (t.includes("dnb") || t.includes("empate no apuesta")) return true;
    return false;
  };

  // pool base: filtra por prob y odds válidas
  let pool = all
    .filter((c) => !isBlocked(c))
    .map((c) => ({ ...c, prob: toProb(c), odd: toOdd(c) }))
    .filter((c) => c.prob !== null && c.odd !== null);

  // para targets altos, dejamos entrar picks agresivos con prob algo menor
  if (T >= 20) {
    pool = pool.filter((c) => c.prob >= (isAggressiveMarket(c) ? Math.max(0.50, minProb - 0.05) : minProb));
  } else {
    pool = pool.filter((c) => c.prob >= minProb);
  }

  // de-dup por fixture+label
  const seen = new Set();
  pool = pool.filter((c) => {
    const k = `${c.fixtureId}::${String(c.label || c.pick || "")}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // agrupar por fixture
  const byFixture = {};
  for (const c of pool) {
    const id = Number(c.fixtureId);
    if (!byFixture[id]) byFixture[id] = [];
    byFixture[id].push(c);
  }

  // ordenar candidates por fixture por "utility"
  const utility = (c, fixtureAlreadyUsedCount) => {
    // base
    const p = c.prob;
    const o = c.odd;
    const u = wOdd * Math.log(o) + (1 - wOdd) * p;

    // penalizar odds muy bajas
    const lowOddPen = o < 1.15 ? -0.25 : o < 1.25 ? -0.10 : 0;

    // si ya usamos ese fixture, penalizar (pero permitir 2 legs)
    const repPen = fixtureAlreadyUsedCount >= 1 ? -0.18 : 0;

    // bonus por value edge si existe
    const ve = Number(c.valueEdge);
    const veBonus = Number.isFinite(ve) ? Math.max(-0.08, Math.min(0.12, ve * 0.6)) : 0;

    // bonus para mercados agresivos cuando target es alto
    const aggBonus = (T >= 50 && isAggressiveMarket(c)) ? 0.08 : (T >= 20 && isAggressiveMarket(c)) ? 0.04 : 0;

    return u + lowOddPen + repPen + veBonus + aggBonus;
  };

  // compatibilidad dentro de fixture (máx 2 legs)
  const isCompatibleInFixture = (a, b) => {
    if (!a || !b) return true;
    const sa = pickLockSignature(a);
    const sb = pickLockSignature(b);
    // mismo mercado exacto no aporta
    if (String(a.label) === String(b.label)) return false;
    // over vs under
    if (sa.ou && sb.ou && sa.ou !== sb.ou) return false;
    // BTTS yes vs no
    if (sa.btts && sb.btts && sa.btts !== sb.btts) return false;
    // side home vs away
    if (sa.side !== "neutral" && sb.side !== "neutral" && sa.side !== sb.side) return false;
    return true;
  };

  // construir parlay greedy con dos fases:
  // 1) diversidad: 1 pick por fixture hasta minLegs o hasta acercarnos a target
  // 2) completar: permitir segundo pick por fixture si falta multiplicar
  const buildGreedy = () => {
    const chosen = [];
    const usedByFx = new Map(); // fxId -> picks array
    let prod = 1;

    const canAdd = (c) => {
      const id = Number(c.fixtureId);
      const arr = usedByFx.get(id) || [];
      if (arr.length >= 2) return false;
      for (const existing of arr) if (!isCompatibleInFixture(existing, c)) return false;
      // no superar cap con margen pequeño
      if (prod * c.odd > CAP * 1.02) return false;
      // locks (si fixture fue bloqueado por pickSafe/gift)
      const lock = arr[0]?.__lock || c.__lock;
      if (lock) {
        const sig = pickLockSignature(c);
        if (!isCompatibleLock(sig, lock)) return false;
      }
      return true;
    };

    const add = (c) => {
      const id = Number(c.fixtureId);
      const arr = usedByFx.get(id) || [];
      arr.push(c);
      usedByFx.set(id, arr);
      chosen.push(c);
      prod *= c.odd;
    };

    // Phase 1: one per fixture
    const fxOrder = Object.keys(byFixture)
      .map(Number)
      .sort((a, b) => (byFixture[b]?.length || 0) - (byFixture[a]?.length || 0));

    for (const fxId of fxOrder) {
      if (chosen.length >= maxLegs) break;
      const list = (byFixture[fxId] || []).slice();
      list.sort((a, b) => utility(b, 0) - utility(a, 0));

      const best = list.find((c) => canAdd(c));
      if (best) add(best);

      if (chosen.length >= minLegs && prod >= T * 0.92) break;
    }

    // Phase 2: if still far from target, allow second legs and slightly riskier picks
    if (prod < T * 0.95 && chosen.length < maxLegs) {
      // flatten all picks with current usage count
      const allCandidates = Object.values(byFixture).flat().slice();
      allCandidates.sort((a, b) => {
        const ua = (usedByFx.get(Number(a.fixtureId)) || []).length;
        const ub = (usedByFx.get(Number(b.fixtureId)) || []).length;
        return utility(b, ub) - utility(a, ua);
      });

      for (const c of allCandidates) {
        if (chosen.length >= maxLegs) break;
        if (prod >= T * 0.98 && chosen.length >= minLegs) break;
        if (canAdd(c)) add(c);
      }
    }

    // si no llegamos al mínimo de legs, rellenar con mejores disponibles aunque no aumente mucho
    if (chosen.length < minLegs) {
      const allCandidates = Object.values(byFixture).flat().slice();
      allCandidates.sort((a, b) => utility(b, 0) - utility(a, 0));
      for (const c of allCandidates) {
        if (chosen.length >= minLegs) break;
        if (chosen.length >= maxLegs) break;
        if (canAdd(c)) add(c);
      }
    }

    return { legs: chosen, finalOdd: prod };
  };

  // correr greedy varias veces con pequeñas perturbaciones para escapar de repeticiones
  let best = null;
  const runs = Math.min(10, Math.max(3, fxIds.length));
  for (let r = 0; r < runs; r++) {
    // shuffle ligero: reordenar porFixture con ruido
    for (const id of Object.keys(byFixture)) {
      byFixture[id].sort((a, b) => (utility(b, 0) - utility(a, 0)) + (Math.random() - 0.5) * 0.12);
    }
    const cand = buildGreedy();
    if (!best) best = cand;
    else {
      const bDist = Math.abs(Math.log((best.finalOdd || 1) / T));
      const cDist = Math.abs(Math.log((cand.finalOdd || 1) / T));
      // preferimos más cerca al target, y si empata, mayor finalOdd
      if (cDist < bDist - 1e-6 || (Math.abs(cDist - bDist) < 1e-6 && cand.finalOdd > best.finalOdd)) {
        best = cand;
      }
    }
  }

  const legs = (best?.legs || []).map((c) => {
    // forma esperada por Comparator
    return {
      ...c,
      usedOdd: c.odd,
    };
  });

  const finalOdd = Number.isFinite(best?.finalOdd) ? best.finalOdd : 1;

  return {
    legs,
    finalOdd,
    target: T,
    cap: CAP,
    reached: finalOdd >= T * 0.95,
    minProb,
    minLegs,
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
