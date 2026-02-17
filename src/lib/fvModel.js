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

export function pickSafe(candidatesByFixture) {
  const all = Object.values(candidatesByFixture || {}).flat();
  all.sort((a, b) => (qRank(b) - qRank(a)) || (pr(b) - pr(a)) || (Number(a.usedOdd) - Number(b.usedOdd)));
  return all[0] || null;
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

export function buildParlay({ candidatesByFixture, target, cap, maxLegs = 12 }) {
  // FV_MODEL_VERSION: aggressive-v2-target-aware
  // Armado target-aware: relaja prob según objetivo y sube odds para alcanzar x20/x50/x100
  // sin contradicciones (misma "dirección" por fixture en mercados de resultado / goles / BTTS).

  const t = Number(target);
  const hardCap = Number(cap);

  if (!Number.isFinite(t) || t <= 1) return null;
  if (!Number.isFinite(hardCap) || hardCap <= 1) return null;

  // ---- umbral dinámico por target (más agresivo para x50/x100) ----
  function minProbForTarget(x) {
    if (x <= 3) return 0.78;
    if (x <= 5) return 0.74;
    if (x <= 10) return 0.70;
    if (x <= 20) return 0.66;
    if (x <= 50) return 0.60;
    return 0.55; // x100
  }
  const minProb = minProbForTarget(t);

  // legs mínimos realistas (para no quedarse corto en x50/x100)
  const minLegs =
    t <= 3 ? 2 :
    t <= 5 ? 3 :
    t <= 10 ? 4 :
    t <= 20 ? 5 :
    t <= 50 ? 8 :
    10;

  const maxLegsHard = Math.max(2, Math.min(16, Number(maxLegs) || 12));
  const allowSecondLegSameFixture = t >= 20;

  // límites por tipo (se relajan en targets altos)
  const perTypeLimit = {
    DC:  t >= 50 ? 8 : t >= 20 ? 6 : 4,
    OU:  t >= 50 ? 8 : t >= 20 ? 6 : 4,
    BTTS: t >= 50 ? 3 : t >= 20 ? 2 : 1,
    OTHER: t >= 50 ? 6 : t >= 20 ? 4 : 3,
  };

  function typeOf(p) {
    const mk = String(p?.market || p?.marketKey || "").toUpperCase();
    if (mk.includes("DC")) return "DC";
    if (mk.includes("OU")) return "OU";
    if (mk.includes("BTTS")) return "BTTS";
    return "OTHER";
  }

  function oddOf(p) {
    const o = Number(p?.usedOdd ?? p?.usedOddDisplay ?? p?.marketOdd ?? p?.fvOdd);
    return Number.isFinite(o) ? o : null;
  }

  function groupKey(p) {
    const mk = String(p?.market || p?.marketKey || "").toUpperCase();
    if (mk.includes("DC") || mk === "1X2" || mk.includes("ML")) return "RESULT";
    if (mk.includes("OU")) return "OU";
    if (mk.includes("BTTS")) return "BTTS";
    return mk || "OTHER";
  }

  function polarityKey(p) {
    // define "dirección" para evitar contradicciones entre targets
    const mk = String(p?.market || p?.marketKey || "").toUpperCase();
    const sel = String(p?.selection || p?.pick || p?.side || "").toLowerCase();
    const lab = String(p?.label || "").toLowerCase();

    if (mk.includes("DC")) {
      if (sel.includes("1x") || lab.includes("1x")) return "1X";
      if (sel.includes("x2") || lab.includes("x2")) return "X2";
      return sel.toUpperCase() || "DC";
    }

    if (mk.includes("OU")) {
      if (sel.includes("over") || lab.includes("over")) return "OVER";
      if (sel.includes("under") || lab.includes("under")) return "UNDER";
      return sel.toUpperCase() || "OU";
    }

    if (mk.includes("BTTS")) {
      if (sel === "yes" || sel === "si" || lab.includes("sí") || lab.includes("si")) return "YES";
      if (sel === "no" || lab.includes("no")) return "NO";
      return sel.toUpperCase() || "BTTS";
    }

    // 1X2 / ML fallback
    if (mk === "1X2" || mk.includes("ML")) {
      if (sel.includes("home") || lab.includes("local")) return "HOME";
      if (sel.includes("away") || lab.includes("visit")) return "AWAY";
      if (sel.includes("draw") || lab.includes("emp")) return "DRAW";
    }

    return (mk + ":" + sel).toUpperCase();
  }

  function isCompatible(a, b) {
    if (!a || !b) return true;
    const ga = groupKey(a);
    const gb = groupKey(b);
    if (ga !== gb) return true;

    const pa = polarityKey(a);
    const pb = polarityKey(b);

    // RESULT: no permitir 1X vs X2, HOME vs AWAY, etc.
    if (ga === "RESULT") return pa === pb;

    // OU: no permitir OVER vs UNDER
    if (ga === "OU") return pa === pb;

    // BTTS: no permitir YES vs NO
    if (ga === "BTTS") return pa === pb;

    return pa === pb;
  }

  function scoreOf(p) {
    // score = prob (rank) + incentivo odds (log) para targets altos
    const probRank = Number(p?.__probRank);
    const p0 = Number.isFinite(probRank) ? probRank : Number(p?.prob);
    const pp = Number.isFinite(p0) ? p0 : 0;
    const o = oddOf(p) ?? 1.0001;
    const logO = Math.log(Math.max(1.0001, o));
    const wOdd = t >= 100 ? 0.32 : t >= 50 ? 0.28 : t >= 20 ? 0.22 : t >= 10 ? 0.16 : 0.10;
    return pp * (1 - wOdd) + logO * wOdd;
  }

  // ---- construir opciones por fixture (top-N) ----
  const byFx = Object.entries(candidatesByFixture || {})
    .map(([fid, list]) => {
      const arr = (list || [])
        .filter(Boolean)
        .filter((p) => {
          const prb = Number.isFinite(Number(p?.__probRank)) ? Number(p?.__probRank) : Number(p?.prob);
          return Number.isFinite(prb);
        })
        .map((p) => {
          const o = oddOf(p);
          return {
            ...p,
            __fx: String(fid),
            __type: typeOf(p),
            __odd: o,
            __pol: polarityKey(p),
            __grp: groupKey(p),
            __score: scoreOf(p),
            __p: Number.isFinite(Number(p?.__probRank)) ? Number(p?.__probRank) : Number(p?.prob),
          };
        })
        .filter((p) => Number.isFinite(p.__odd) && p.__odd > 1.0001)
        .sort((a, b) => (b.__score - a.__score));

      if (!arr.length) return null;

      // topN más grande para targets altos (más opciones para subir cuota)
      const topN = arr.slice(0, t >= 50 ? 10 : t >= 20 ? 8 : 6);
      return { fid: String(fid), options: topN };
    })
    .filter(Boolean);

  if (byFx.length < 2) return null;

  // orden: mejores fixtures primero, pero permitiendo diversidad
  byFx.sort((a, b) => (b.options[0].__score - a.options[0].__score));

  // ---- lock de "dirección" por fixture y grupo (RESULT/OU/BTTS) para evitar contradicciones entre targets ----
  // Elegimos lock por fixture basado en la opción de MAYOR probabilidad dentro de cada grupo.
  const lock = {}; // lock[fid][group] = polarity
  for (const fx of byFx) {
    const perGroup = {};
    for (const cand of fx.options) {
      const g = cand.__grp;
      if (g !== "RESULT" && g !== "OU" && g !== "BTTS") continue;
      const prev = perGroup[g];
      if (!prev || (cand.__p > prev.__p)) perGroup[g] = cand;
    }
    lock[fx.fid] = lock[fx.fid] || {};
    for (const [g, c] of Object.entries(perGroup)) {
      lock[fx.fid][g] = c.__pol;
    }
  }

  function respectsLock(cand) {
    const fid = cand.__fx;
    const g = cand.__grp;
    if (!lock?.[fid]?.[g]) return true;
    // solo forzamos lock en grupos críticos
    if (g === "RESULT" || g === "OU" || g === "BTTS") {
      return cand.__pol === lock[fid][g];
    }
    return true;
  }

  // ---- selección greedy pero con utilidad para acercarse al target ----
  const legs = [];
  const usedFx = new Set();
  const typeCount = { DC: 0, OU: 0, BTTS: 0, OTHER: 0 };
  let prod = 1;

  function canTake(cand) {
    if (!cand) return false;

    // prob threshold dinámico
    if ((cand.__p ?? 0) < minProb) return false;

    // lock anti-contradicción entre targets
    if (!respectsLock(cand)) return false;

    const typ = cand.__type || "OTHER";
    if ((typeCount[typ] || 0) >= (perTypeLimit[typ] ?? 99)) return false;

    const next = prod * cand.__odd;
    if (next > hardCap * 1.03) return false;

    return true;
  }

  function utility(cand) {
    // Incentivo: acercarse al target sin pasarse, y preferir odds medias/altas en targets altos
    const next = prod * cand.__odd;
    const closeness = Math.min(1, next / Math.max(1.0001, t)); // 0..1
    const o = cand.__odd;
    const logO = Math.log(Math.max(1.0001, o));
    const wClose = t >= 50 ? 0.55 : t >= 20 ? 0.45 : 0.35;
    const wOdd = t >= 50 ? 0.30 : t >= 20 ? 0.25 : 0.20;
    const wProb = 1 - (wClose + wOdd);
    return (cand.__p * wProb) + (closeness * wClose) + (logO * wOdd);
  }

  function pickBestFromOptions(options, alreadyInSameFx = []) {
    const compatWith = alreadyInSameFx;
    let best = null;
    let bestU = -Infinity;

    for (const cand of options) {
      if (!canTake(cand)) continue;

      // compatibilidad con legs ya tomados del mismo fixture (si corresponde)
      let ok = true;
      for (const prev of compatWith) {
        if (!isCompatible(prev, cand)) { ok = false; break; }
      }
      if (!ok) continue;

      const u = utility(cand);
      if (u > bestU) {
        bestU = u;
        best = cand;
      }
    }
    return best;
  }

  for (const fx of byFx) {
    // primera pierna: máximo 1 por fixture en primera pasada
    const first = pickBestFromOptions(fx.options, []);
    if (!first) continue;

    legs.push(first);
    usedFx.add(fx.fid);
    typeCount[first.__type] = (typeCount[first.__type] || 0) + 1;
    prod *= first.__odd;

    // segunda pierna en el mismo fixture (solo para targets altos y si aún falta multiplicación)
    if (allowSecondLegSameFixture && legs.length < maxLegsHard && prod < t * 0.92) {
      const second = pickBestFromOptions(fx.options, [first]);
      if (second && second !== first) {
        legs.push(second);
        typeCount[second.__type] = (typeCount[second.__type] || 0) + 1;
        prod *= second.__odd;
      }
    }

    if (legs.length >= maxLegsHard) break;
    if (prod >= t * 0.98 && legs.length >= 3) break;
  }

  // fallback: si no alcanzó, intenta añadir más legs (aunque sea con prob ligeramente menor) para targets altos
  if (prod < t * 0.85 && legs.length < maxLegsHard && t >= 20) {
    const minProb2 = Math.max(0.50, minProb - (t >= 100 ? 0.07 : t >= 50 ? 0.06 : 0.05));

    for (const fx of byFx) {
      if (legs.length >= maxLegsHard) break;

      // si ya usamos ese fixture, intentamos agregar una segunda/tercera pierna compatible (si es posible)
      const sameFxLegs = legs.filter((l) => String(l.__fx) === String(fx.fid));
      const allowMoreInFx = allowSecondLegSameFixture && sameFxLegs.length < 2;

      if (!allowMoreInFx && usedFx.has(fx.fid)) continue;

      // selección con prob relajada
      let best = null;
      let bestU = -Infinity;

      for (const cand of fx.options) {
        if ((cand.__p ?? 0) < minProb2) continue;
        if (!respectsLock(cand)) continue;

        const typ = cand.__type || "OTHER";
        if ((typeCount[typ] || 0) >= (perTypeLimit[typ] ?? 99)) continue;

        if (!usedFx.has(fx.fid)) {
          // ok, no hay compat en fixture
        } else {
          // ya hay legs de este fixture: deben ser compatibles
          let ok = true;
          for (const prev of sameFxLegs) {
            if (!isCompatible(prev, cand)) { ok = false; break; }
          }
          if (!ok) continue;
        }

        const next = prod * cand.__odd;
        if (next > hardCap * 1.03) continue;

        const u = utility(cand);
        if (u > bestU) { bestU = u; best = cand; }
      }

      if (!best) continue;

      legs.push(best);
      usedFx.add(fx.fid);
      typeCount[best.__type] = (typeCount[best.__type] || 0) + 1;
      prod *= best.__odd;

      if (prod >= t * 0.96 && legs.length >= minLegs) break;
    }
  }

  if (legs.length < Math.min(minLegs, maxLegsHard)) return null;

  return {
    target: t,
    cap: hardCap,
    games: legs.length,
    finalOdd: round2(prod),
    impliedProb: round2(1 / prod),
    legs,
    picks: legs,
    reached: prod >= t * 0.90,
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
