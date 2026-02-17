// FV_MODEL_VERSION: 2026-02-16-fix-no-tdz
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
  }
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
  }
}

export function estimateLambdasFromPack(pack) {
  // El backend puede enviar llaves en camelCase o PascalCase.
  // Ej: { model: { LambdaHome, LambdaAway, LambdaTotal } }
  function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function pick(...vals) {
    for (const v of vals) {
      const n = safeNum(v);
      if (n != null) return n;
    }
    return null;
  }
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
    marketOdd: markets?.OU_35?.under ?? markets?.OU_25?.under ?? null,
  });

  out.push({
    market: "OU_15",
    selection: "over",
    label: "Over 1.5 goles",
    prob: over15,
    fvOdd: fairOddFromProb(over15),
    marketOdd: markets?.OU_15?.over ?? markets?.OU_25?.over ?? null,
  });

  // (Opcional) Línea más agresiva para subir cuota cuando el target es muy alto.
  out.push({
    market: "OU_25",
    selection: "over",
    label: "Over 2.5 goles (agresivo)",
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


  out.push({
    market: "BTTS",
    selection: "yes",
    label: "Ambos marcan: SÍ",
    prob: clamp(1 - bttsNo, 0.01, 0.99),
    fvOdd: fairOddFromProb(clamp(1 - bttsNo, 0.01, 0.99)),
    marketOdd: markets?.BTTS?.yes ?? null,
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
    }
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
  }
}

export function buildParlay({ candidatesByFixture, target, cap, maxLegs = 26 }) {
  // Armado de parlays con:
  // - Consistencia por fixture (no contradicciones entre targets)
  // - Posibilidad de 2 legs por fixture (solo compatibles) para targets altos
  // - Booster pass para intentar llegar a x20/x50/x100 cuando el pool lo permite

  var t = Number(target);
  var hardCap = Number(cap);

  if (!Number.isFinite(t) || t <= 1) return null;
  if (!Number.isFinite(hardCap) || hardCap <= 1) return null;

  // minLegs por target (más legs cuando el objetivo es alto)
  var minLegs = t >= 100 ? 6 : t >= 50 ? 6 : t >= 20 ? 4 : 2;

  // Prob mínima por target (relaja a medida que sube el objetivo)
  var minProb =
    t <= 5 ? 0.72 :
    t <= 10 ? 0.66 :
    t <= 20 ? 0.62 :
    t <= 50 ? 0.58 :
    0.55;

  // Para el "booster pass" (x50/x100), permitimos un poco menos prob si hace falta
  var minProbBoost =
    t >= 100 ? Math.max(0.50, minProb - 0.08) :
    t >= 50 ? Math.max(0.52, minProb - 0.06) :
    t >= 20 ? Math.max(0.55, minProb - 0.04) :
    minProb;

  // Límites por tipo (evitar "todo DC" o "todo OU")
  var perTypeLimitBase = {
    DC: 8,
    OU: 8,
    BTTS: 2,
    OTHER: 2,
  };

  function typeOf(p) {
    var mk = String(p && (p.market || p.marketKey) || "").toUpperCase();
    if (mk.indexOf("DC") >= 0) return "DC";
    if (mk.indexOf("OU") >= 0) return "OU";
    if (mk.indexOf("BTTS") >= 0) return "BTTS";
    return "OTHER";
  }

  function oddOf(p) {
    var o = Number(p && (p.usedOdd != null ? p.usedOdd : (p.marketOdd != null ? p.marketOdd : p.fvOdd)));
    return Number.isFinite(o) ? o : null;
  }

  function probRankOf(p) {
    var pr = Number(p && (p.__probRank != null ? p.__probRank : p.prob));
    return Number.isFinite(pr) ? pr : 0;
  }

  function dirKey(p) {
    // Dirección para bloquear contradicciones dentro de un mismo mercado
    // DC: 1X / X2 / 12
    // OU: O (over) / U (under)
    // BTTS: Y / N
    var mk = String(p && (p.market || p.marketKey) || "").toUpperCase();
    var out = String(p && (p.outcome || p.pick || p.label) || "").toUpperCase();

    if (mk.indexOf("DC") >= 0) {
      if (out.indexOf("1X") >= 0) return "DC:1X";
      if (out.indexOf("X2") >= 0) return "DC:X2";
      if (out.indexOf("12") >= 0) return "DC:12";
      // fallback: si viene como "HOME_OR_DRAW" etc.
      if (out.indexOf("HOME") >= 0 && out.indexOf("DRAW") >= 0) return "DC:1X";
      if (out.indexOf("AWAY") >= 0 && out.indexOf("DRAW") >= 0) return "DC:X2";
      return "DC:UNK";
    }

    if (mk.indexOf("OU") >= 0) {
      if (out.indexOf("OVER") >= 0) return "OU:O";
      if (out.indexOf("UNDER") >= 0) return "OU:U";
      // fallback por key
      if (mk.indexOf("OVER") >= 0) return "OU:O";
      if (mk.indexOf("UNDER") >= 0) return "OU:U";
      return "OU:UNK";
    }

    if (mk.indexOf("BTTS") >= 0) {
      if (out.indexOf("YES") >= 0 || out.indexOf("SI") >= 0) return "BTTS:Y";
      if (out.indexOf("NO") >= 0) return "BTTS:N";
      return "BTTS:UNK";
    }

    return "OTHER";
  }

  function incompatible(a, b) {
    // Contradicciones duras dentro del MISMO fixture
    var ka = dirKey(a);
    var kb = dirKey(b);

    // DC
    if (ka.indexOf("DC:") === 0 && kb.indexOf("DC:") === 0) {
      // 1X vs X2 es contradicción
      if ((ka === "DC:1X" && kb === "DC:X2") || (ka === "DC:X2" && kb === "DC:1X")) return true;
      // 12 contradice con 1X o X2? No necesariamente, pero suele ser agresivo; lo tratamos como incompatible con 1X/X2 para estabilidad
      if (ka === "DC:12" && (kb === "DC:1X" || kb === "DC:X2")) return true;
      if (kb === "DC:12" && (ka === "DC:1X" || ka === "DC:X2")) return true;
      return false;
    }

    // OU
    if (ka.indexOf("OU:") === 0 && kb.indexOf("OU:") === 0) {
      if ((ka === "OU:O" && kb === "OU:U") || (ka === "OU:U" && kb === "OU:O")) return true;
      return false;
    }

    // BTTS
    if (ka.indexOf("BTTS:") === 0 && kb.indexOf("BTTS:") === 0) {
      if ((ka === "BTTS:Y" && kb === "BTTS:N") || (ka === "BTTS:N" && kb === "BTTS:Y")) return true;
      return false;
    }

    return false;
  }

  function scoreOf(p) {
    // Score balanceado: prob fuerte + incentivo por odd (más peso en x50/x100)
    var pp = probRankOf(p);
    var o = oddOf(p) || 1;
    var logO = Math.log(Math.max(1.0001, o));
    var wOdd = t >= 100 ? 0.45 : t >= 50 ? 0.38 : t >= 20 ? 0.30 : t >= 10 ? 0.18 : 0.10;
    return pp * (1 - wOdd) + logO * wOdd;
  }

  // --- construir opciones por fixture + lock primario (consistencia entre targets) ---
  var byFx = Object.entries(candidatesByFixture || {}).map(function (entry) {
    var fid = entry[0];
    var list = entry[1] || [];

    var arr = list
      .filter(Boolean)
      .filter(function (p) {
        var pr = Number(p && (p.__probRank != null ? p.__probRank : p.prob));
        return Number.isFinite(pr);
      })
      .map(function (p) {
        var o = oddOf(p);
        return Object.assign({}, p, {
          __type: typeOf(p),
          __odd: o,
          __probR: probRankOf(p),
          __score: scoreOf(p),
          __fx: fid,
          __dir: dirKey(p),
        });
      })
      .filter(function (p) {
        return Number.isFinite(p.__odd) && p.__odd > 1.0001;
      })
      .sort(function (a, b) {
        return b.__score - a.__score;
      });

    if (!arr.length) return null;

    // Lock primario = la mejor opción por score (igual para todos los targets)
    var primary = arr[0];

    // Filtrar opciones incompatibles con primary (evita X1 vs X2 entre x3/x5/x100)
    var filtered = arr.filter(function (p) {
      return !incompatible(p, primary);
    });

    // Mantener top-N por fixture (más opciones para boosters)
    var topN = filtered.slice(0, 8);

    if (!topN.length) return null;
    return { fid: fid, options: topN, primary: primary };
  }).filter(Boolean);

  if (byFx.length < minLegs) return null;

  // Ordenar fixtures: primero los que tienen mejor primary
  byFx.sort(function (a, b) {
    return (b.primary.__score || 0) - (a.primary.__score || 0);
  });

  function wouldExceedCap(prod, odd) {
    return prod * odd > hardCap * 1.02;
  }

  function pickLegFromFixture(fx, allowLowProb, usedMarkets, currentProd, typeCount) {
    // Selecciona 1 leg para este fixture respetando prob y límites por tipo
    for (var i = 0; i < fx.options.length; i++) {
      var cand = fx.options[i];
      var pOk = cand.__probR || 0;
      if (!allowLowProb && pOk < minProb) continue;
      if (allowLowProb && pOk < minProbBoost) continue;

      var mk = String(cand.market || cand.marketKey || "");
      if (usedMarkets && usedMarkets[mk]) continue;

      var typ = cand.__type || "OTHER";
      if ((typeCount[typ] || 0) >= (perTypeLimitBase[typ] || 99)) continue;

      if (wouldExceedCap(currentProd, cand.__odd)) continue;
      return cand;
    }
    return null;
  }

  // --- Pass 1: 1 pick por fixture (primarios compatibles por defecto) ---
  var legs = [];
  var prod = 1;
  var typeCount = { DC: 0, OU: 0, BTTS: 0, OTHER: 0 };
  var fxLegCount = {}; // fid -> cantidad
  var fxLegs = {};     // fid -> array legs

  for (var f = 0; f < byFx.length; f++) {
    var fx = byFx[f];
    var usedMarkets = {};
    var picked = pickLegFromFixture(fx, false, usedMarkets, prod, typeCount);
    if (!picked) continue;

    legs.push(picked);
    prod *= picked.__odd;
    typeCount[picked.__type] = (typeCount[picked.__type] || 0) + 1;
    fxLegCount[fx.fid] = (fxLegCount[fx.fid] || 0) + 1;
    fxLegs[fx.fid] = (fxLegs[fx.fid] || []);
    fxLegs[fx.fid].push(picked);

    if (legs.length >= maxLegs) break;
    if (prod >= t * 0.95 && legs.length >= minLegs) break;
  }

  if (legs.length < minLegs) return null;

  // --- Pass 2: boosters (agrega más legs para intentar llegar a target) ---
  var allowSecondLeg = t >= 20; // para x20+ permitimos 2 legs por fixture
  if (prod < t * 0.95 && legs.length < maxLegs) {
    // Creamos un pool ordenado por "impacto" (odd alto + prob aceptable)
    var boosterPool = [];

    for (var bf = 0; bf < byFx.length; bf++) {
      var fx2 = byFx[bf];
      var already = fxLegs[fx2.fid] || [];
      var count = fxLegCount[fx2.fid] || 0;
      if (!allowSecondLeg && count >= 1) continue;
      if (allowSecondLeg && count >= 2) continue;

      for (var j = 0; j < fx2.options.length; j++) {
        var c = fx2.options[j];

        // evitar duplicar el mismo mercado en el mismo fixture
        var dup = false;
        for (var k = 0; k < already.length; k++) {
          var mkA = String(already[k].market || already[k].marketKey || "");
          var mkB = String(c.market || c.marketKey || "");
          if (mkA === mkB) { dup = true; break; }
          if (incompatible(already[k], c)) { dup = true; break; }
        }
        if (dup) continue;

        var pOk2 = c.__probR || 0;
        if (pOk2 < minProbBoost) continue;

        // Preferir boosters con odds decentes para subir producto
        if (c.__odd < (t >= 50 ? 1.20 : 1.15)) continue;

        boosterPool.push(c);
      }
    }

    boosterPool.sort(function (a, b) {
      // Mayor impacto: log(odd) + score
      var ia = Math.log(Math.max(1.0001, a.__odd)) + (a.__score || 0) * 0.25;
      var ib = Math.log(Math.max(1.0001, b.__odd)) + (b.__score || 0) * 0.25;
      return ib - ia;
    });

    for (var bp = 0; bp < boosterPool.length; bp++) {
      var candB = boosterPool[bp];
      var fidB = String(candB.__fx);
      var countB = fxLegCount[fidB] || 0;
      if (!allowSecondLeg && countB >= 1) continue;
      if (allowSecondLeg && countB >= 2) continue;

      if (wouldExceedCap(prod, candB.__odd)) continue;

      // type limit
      var typB = candB.__type || "OTHER";
      if ((typeCount[typB] || 0) >= (perTypeLimitBase[typB] || 99)) continue;

      // compat con legs existentes del mismo fixture (redundante, pero seguro)
      var ok = true;
      var already2 = fxLegs[fidB] || [];
      for (var kk = 0; kk < already2.length; kk++) {
        if (incompatible(already2[kk], candB)) { ok = false; break; }
        var mk1 = String(already2[kk].market || already2[kk].marketKey || "");
        var mk2 = String(candB.market || candB.marketKey || "");
        if (mk1 === mk2) { ok = false; break; }
      }
      if (!ok) continue;

      legs.push(candB);
      prod *= candB.__odd;
      typeCount[typB] = (typeCount[typB] || 0) + 1;
      fxLegCount[fidB] = (fxLegCount[fidB] || 0) + 1;
      fxLegs[fidB] = (fxLegs[fidB] || []);
      fxLegs[fidB].push(candB);

      if (legs.length >= maxLegs) break;
      if (prod >= t * 0.97) break;
    }
  }

  // output
  return {
    legs: legs,
    prod: prod,
    typeCount: typeCount,
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
