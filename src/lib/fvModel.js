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

export function buildParlay({
  candidatesByFixture,
  target,
  cap,
  maxLegs = 26,
  // permite diversificar entre parlays (penaliza fixtures ya usados)
  fixturePenalty = null,
  // bloqueo de dirección por fixture para evitar contradicciones entre parlays/secciones
  locks = null,
}) {
  const t = Number(target);
  const hardCap = Number(cap);

  if (!Number.isFinite(t) || t <= 1) return null;
  if (!Number.isFinite(hardCap) || hardCap <= 1) return null;

  // legs mínimos por objetivo (más realista)
  const minLegs = t >= 100 ? 10 : t >= 50 ? 8 : t >= 20 ? 5 : t >= 10 ? 4 : t >= 5 ? 3 : 2;

  // prob mínima dinámica (libera mercados para targets altos)
  const minProb =
    t <= 3 ? 0.78 :
    t <= 5 ? 0.74 :
    t <= 10 ? 0.70 :
    t <= 20 ? 0.66 :
    t <= 50 ? 0.60 :
    0.55;

  // límites por tipo para evitar "todo DC"
  const perTypeLimitBase = {
    DC: 8,
    OU: 8,
    BTTS: 3,
    ML: 3,
    DNB: 3,
    OTHER: 4,
  };

  function typeOf(p) {
    const mk = String(p?.market || p?.marketKey || "").toUpperCase();
    if (mk.includes("DC")) return "DC";
    if (mk.includes("OU") || mk.includes("OVER") || mk.includes("UNDER")) return "OU";
    if (mk.includes("BTTS")) return "BTTS";
    if (mk.includes("DNB")) return "DNB";
    if (mk.includes("1X2") || mk.includes("RESULT")) return "ML";
    return "OTHER";
  }

  function oddOf(p) {
    const o = Number(p?.usedOdd ?? p?.marketOdd ?? p?.fvOdd);
    return Number.isFinite(o) ? o : null;
  }

  function probOf(p) {
    const prk = Number(p?.__probRank);
    if (Number.isFinite(prk)) return prk;
    const p0 = Number(p?.prob);
    return Number.isFinite(p0) ? p0 : 0;
  }

  function lockAllows(p) {
    if (!locks) return true;
    const fid = String(p?.fixtureId ?? p?.__fx ?? "");
    if (!fid) return true;

    const mk = String(p?.market || "").toUpperCase();
    const sel = String(p?.selection || "").toUpperCase();

    // result lock: DC / 1X2 / DNB
    if (mk.includes("DC") || mk.includes("1X2") || mk.includes("RESULT") || mk.includes("DNB")) {
      const want = locks?.result?.[fid];
      if (!want) return true;
      return want === sel;
    }
    // OU lock (dirección): OVER vs UNDER (la línea puede variar)
    if (mk.includes("OU")) {
      const dir = sel.includes("OVER") ? "OVER" : sel.includes("UNDER") ? "UNDER" : null;
      const want = locks?.ou?.[fid];
      if (!want || !dir) return true;
      return want === dir;
    }
    // BTTS lock (dirección)
    if (mk.includes("BTTS")) {
      const dir = sel.includes("YES") || sel.includes("SI") ? "YES" : sel.includes("NO") ? "NO" : null;
      const want = locks?.btts?.[fid];
      if (!want || !dir) return true;
      return want === dir;
    }

    return true;
  }

  function isContradict(a, b) {
    if (!a || !b) return false;
    const mkA = String(a.market || "").toUpperCase();
    const mkB = String(b.market || "").toUpperCase();
    const selA = String(a.selection || "").toUpperCase();
    const selB = String(b.selection || "").toUpperCase();

    // DC / RESULT / DNB: no permitir selecciones distintas
    const isResA = mkA.includes("DC") || mkA.includes("1X2") || mkA.includes("RESULT") || mkA.includes("DNB");
    const isResB = mkB.includes("DC") || mkB.includes("1X2") || mkB.includes("RESULT") || mkB.includes("DNB");
    if (isResA && isResB) return selA !== selB;

    // OU: over vs under
    if (mkA.includes("OU") && mkB.includes("OU")) {
      const dirA = selA.includes("OVER") ? "OVER" : selA.includes("UNDER") ? "UNDER" : "X";
      const dirB = selB.includes("OVER") ? "OVER" : selB.includes("UNDER") ? "UNDER" : "X";
      return dirA !== "X" && dirB !== "X" && dirA !== dirB;
    }

    // BTTS
    if (mkA.includes("BTTS") && mkB.includes("BTTS")) return selA !== selB;

    return false;
  }

  // score híbrido: prob + incentivo por odds (más fuerte en targets altos) + penalización por fixture repetido
  function scoreOf(p) {
    const pp = probOf(p);
    const o = oddOf(p) ?? 1;
    const logO = Math.log(Math.max(1.0001, o));
    const wOdd = t >= 100 ? 0.48 : t >= 50 ? 0.42 : t >= 20 ? 0.34 : t >= 10 ? 0.22 : 0.12;

    const fid = String(p?.fixtureId ?? p?.__fx ?? "");
    const pen = fixturePenalty && fid ? Number(fixturePenalty[fid] || 0) : 0;
    const wPen = t >= 50 ? 0.10 : 0.06; // penaliza suave
    return pp * (1 - wOdd) + logO * wOdd - pen * wPen;
  }

  // options por fixture
  const byFx = Object.entries(candidatesByFixture || {})
    .map(([fid, list]) => {
      const arr = (list || [])
        .filter(Boolean)
        .filter((p) => {
          const o = oddOf(p);
          return Number.isFinite(o) && o > 1.0001;
        })
        .filter(lockAllows)
        .map((p) => ({
          ...p,
          __type: typeOf(p),
          __odd: oddOf(p),
          __prob2: probOf(p),
          __score: scoreOf(p),
          __fx: String(p?.fixtureId ?? fid),
        }))
        .sort((a, b) => (b.__score - a.__score));

      // top-N por fixture (permite swaps/boosters)
      const topN = arr.slice(0, 6);
      if (!topN.length) return null;
      return { fid: String(fid), options: topN };
    })
    .filter(Boolean);

  // si no hay suficientes fixtures, igual intentamos con lo que hay
  if (!byFx.length) return { target: t, cap: hardCap, games: 0, finalOdd: 0, impliedProb: null, legs: [], picks: [], reached: false };

  // orden: primero mejores opciones
  byFx.sort((a, b) => (b.options[0].__score - a.options[0].__score));

  // 1) greedy por fixtures, 1 leg por fixture, buscando llegar a target sin pasarse de cap
  function buildOnePass({ perTypeLimit, allowLowProb }) {
    const legs = [];
    const typeCount = { DC: 0, OU: 0, BTTS: 0, ML: 0, DNB: 0, OTHER: 0 };
    let prod = 1;

    for (const fx of byFx) {
      let picked = null;

      for (const cand of fx.options) {
        if (!allowLowProb && cand.__prob2 < minProb) continue;

        const typ = cand.__type || "OTHER";
        if ((typeCount[typ] || 0) >= (perTypeLimit[typ] ?? 99)) continue;

        const next = prod * cand.__odd;
        if (next > hardCap * 1.03) continue;

        picked = cand;
        break;
      }

      if (!picked) continue;

      legs.push(picked);
      typeCount[picked.__type] = (typeCount[picked.__type] || 0) + 1;
      prod *= picked.__odd;

      if (legs.length >= maxLegs) break;
      if (prod >= t * 0.98 && legs.length >= minLegs) break;
    }

    return { legs, prod, typeCount };
  }

  // intentos con relajación progresiva
  const a1 = buildOnePass({ perTypeLimit: perTypeLimitBase, allowLowProb: false });

  const relaxed = {
    ...perTypeLimitBase,
    DC: perTypeLimitBase.DC + 2,
    OU: perTypeLimitBase.OU + 2,
    BTTS: perTypeLimitBase.BTTS + (t >= 50 ? 1 : 0),
    ML: perTypeLimitBase.ML + 1,
    OTHER: perTypeLimitBase.OTHER + 2,
  };
  const a2 = a1.prod >= t * 0.92 ? a1 : buildOnePass({ perTypeLimit: relaxed, allowLowProb: false });

  const a3 = a2.prod >= t * 0.90 ? a2 : buildOnePass({ perTypeLimit: relaxed, allowLowProb: true });

  let legs = (a3.legs || []).slice();
  let prod = Number.isFinite(a3.prod) ? a3.prod : 1;

  // 2) expansión: permite 2 legs por fixture SOLO para targets altos (x20+)
  const maxPerFixture = t >= 20 ? 2 : 1;

  function canAdd(extra) {
    if (!extra) return false;
    const fx = String(extra.__fx ?? extra.fixtureId ?? "");
    const same = legs.filter((l) => String(l.__fx ?? l.fixtureId ?? "") === fx);
    if (same.length >= maxPerFixture) return false;
    for (const s of same) {
      if (isContradict(s, extra) || isContradict(extra, s)) return false;
    }
    return true;
  }

  if (maxPerFixture > 1 && (prod < t * 0.95 || legs.length < minLegs)) {
    const allOpts = byFx.flatMap((fx) => fx.options);
    // boosters: prioriza odds altas, pero exige score decente
    allOpts.sort((a, b) => (b.__odd - a.__odd) || (b.__score - a.__score));

    const boosterMinProb = t >= 100 ? 0.55 : t >= 50 ? 0.58 : 0.60;

    for (const cand of allOpts) {
      if (legs.length >= maxLegs) break;
      if (prod >= t * 0.99 && legs.length >= minLegs) break;
      if (!canAdd(cand)) continue;
      if (cand.__prob2 < boosterMinProb) continue;

      const next = prod * cand.__odd;
      if (next > hardCap * 1.03) continue;

      legs.push(cand);
      prod = next;
    }
  }

  // 3) fallback final: si aún no llega, agrega mejores (aunque no llegue target) para no dejar vacío
  if (legs.length < minLegs) {
    for (const fx of byFx) {
      if (legs.length >= minLegs) break;
      const cand = fx.options[0];
      if (!cand) continue;
      // evita duplicar fixture si ya está, en fallback
      if (legs.some((l) => String(l.__fx) === String(cand.__fx))) continue;
      const next = prod * cand.__odd;
      if (next > hardCap * 1.05) continue;
      legs.push(cand);
      prod = next;
    }
  }

  // si todavía no, igual retorna lo que haya
  prod = Number.isFinite(prod) ? prod : 0;

  return {
    target: t,
    cap: hardCap,
    games: legs.length,
    finalOdd: round2(prod),
    impliedProb: prod > 0 ? round2(1 / prod) : null,
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


export function buildFvOutput({ candidatesByFixture, maxBoost = 100 } = {}) {
  const byFx = candidatesByFixture || {};

  // --- construir locks anti-contradicciones (misma dirección por fixture) ---
  const locks = { result: {}, ou: {}, btts: {} };

  function mk(p){ return String(p?.market || p?.marketKey || "").toUpperCase(); }
  function sel(p){ return String(p?.selection || "").toUpperCase(); }
  function isResult(m){ return m.includes("DC") || m.includes("1X2") || m.includes("RESULT") || m.includes("DNB"); }
  function isOU(m){ return m.includes("OU"); }
  function isBTTS(m){ return m.includes("BTTS"); }

  // elegimos un "ancla" por familia (result, OU, BTTS) según mejor score/odd/prob
  Object.entries(byFx).forEach(([fid, list]) => {
    const arr = (list || []).filter(Boolean);
    const score = (p) => {
      const p0 = Number.isFinite(Number(p?.__probRank)) ? Number(p.__probRank) : Number(p?.prob || 0);
      const o0 = Number.isFinite(Number(p?.marketOdd)) ? Number(p.marketOdd) : Number.isFinite(Number(p?.fvOdd)) ? Number(p.fvOdd) : 1;
      return (p0 || 0) + Math.log(Math.max(1.0001, o0)) * 0.12;
    };

    const bestRes = arr
      .filter((p) => isResult(mk(p)))
      .sort((a,b)=>score(b)-score(a))[0];
    if (bestRes) locks.result[String(fid)] = sel(bestRes);

    const bestOU = arr
      .filter((p) => isOU(mk(p)))
      .sort((a,b)=>score(b)-score(a))[0];
    if (bestOU) {
      const s = sel(bestOU);
      locks.ou[String(fid)] = s.includes("OVER") ? "OVER" : s.includes("UNDER") ? "UNDER" : undefined;
    }

    const bestBT = arr
      .filter((p) => isBTTS(mk(p)))
      .sort((a,b)=>score(b)-score(a))[0];
    if (bestBT) {
      const s = sel(bestBT);
      locks.btts[String(fid)] = (s.includes("YES") || s.includes("SI")) ? "YES" : s.includes("NO") ? "NO" : undefined;
    }
  });

  // --- conservador OU (Over2.5->Over1.5, Under2.5->Under3.5) ---
  function normalizeOU(p) {
    if (!p) return p;
    const m = mk(p);
    if (!m.includes("OU")) return p;

    const s = String(p.selection || "");
    if (/2\.5/.test(s)) {
      if (/OVER/i.test(s)) {
        return { ...p, selection: s.replace(/2\.5/g, "1.5"), label: (p.label || "").replace(/2\.5/g, "1.5") };
      }
      if (/UNDER/i.test(s)) {
        return { ...p, selection: s.replace(/2\.5/g, "3.5"), label: (p.label || "").replace(/2\.5/g, "3.5") };
      }
    }
    return p;
  }

  function passesLocks(fid, p){
    const m = mk(p);
    const s = sel(p);

    if (isResult(m)) {
      const want = locks.result[String(fid)];
      return !want || want === s;
    }
    if (isOU(m)) {
      const dir = s.includes("OVER") ? "OVER" : s.includes("UNDER") ? "UNDER" : null;
      const want = locks.ou[String(fid)];
      return !want || !dir || want === dir;
    }
    if (isBTTS(m)) {
      const dir = (s.includes("YES") || s.includes("SI")) ? "YES" : s.includes("NO") ? "NO" : null;
      const want = locks.btts[String(fid)];
      return !want || !dir || want === dir;
    }
    return true;
  }

  // aplica normalize + locks a todos los candidates (sin mutar input)
  const byFxNorm = {};
  Object.entries(byFx).forEach(([fid, list]) => {
    byFxNorm[fid] = (list || [])
      .map((p) => normalizeOU(p))
      .filter((p) => passesLocks(fid, p));
  });

  // --- pick seguro / regalo / value ---
  const safe = pickSafe(byFxNorm);
  const giftBundle = buildGiftPickBundle(byFxNorm, 1.5, 3.0, 3);
  const valueList = buildValueList(byFxNorm, 0.06);

  // --- parlays secuenciales con penalización de fixtures para diversificar ---
  const targetsAll = [3, 5, 10, 20, 50, 100];
  const maxB = Number(maxBoost || 100);
  const targets = targetsAll.filter((x) => x <= maxB);

  // cap dinámico: deja margen para alcanzar targets altos sin romper el plan
  const cap = Math.max(3, maxB * 1.20);

  const fixturePenalty = {}; // conteo por fixture en parlays previos

  const parlays = targets.map((t) => {
    const p = buildParlay({
      candidatesByFixture: byFxNorm,
      target: t,
      cap,
      maxLegs: t >= 100 ? 26 : t >= 50 ? 22 : t >= 20 ? 18 : 14,
      fixturePenalty,
      locks,
    });

    (p?.legs || []).forEach((leg) => {
      const fid = String(leg?.fixtureId ?? leg?.__fx ?? "");
      if (!fid) return;
      fixturePenalty[fid] = (fixturePenalty[fid] || 0) + 1;
    });

    return p;
  }).filter(Boolean);

  return { safe, giftBundle, parlays, valueList, locks };
}

