// src/lib/fvModel.js
// Factor Victoria — Motor estable de picks + parlays (sin contradicciones).
// - Bloqueo por fixtureId para evitar predicciones opuestas entre secciones.
// - Over/Under más conservador: Over 2.5 => Over 1.5; Under 2.5 => Under 3.5.
// - Parlays que escalan con muchos partidos y nunca dejan secciones vacías.
//
// Nota: el backend hoy entrega OU_25 (2.5). Este motor soporta OU_15 y OU_35 si existen,
// pero si no vienen, usa FV odds (fair odds) como fallback para no romper el cálculo.

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function round2(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Number(x.toFixed(2)) : null;
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function avg(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  const nums = arr.map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// =====================
// Probabilidades / Odds
// =====================

export function fairOddFromProb(p) {
  const pp = clamp(Number(p || 0), 1e-6, 0.999999);
  return round2(1 / pp);
}

function poissonP(k, lambda) {
  if (!Number.isFinite(lambda) || lambda <= 0) return 0;
  if (k < 0) return 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

export function probUnderLine(lambdaTotal, line) {
  // P(Goals <= floor(line)) para líneas 0.5, 1.5, 2.5, 3.5...
  // Under 2.5 => Goals <= 2; Under 3.5 => Goals <= 3
  const maxGoals = 12;
  const kMax = Math.max(0, Math.min(maxGoals, Math.floor(Number(line))));
  let s = 0;
  for (let k = 0; k <= kMax; k++) s += poissonP(k, lambdaTotal);
  return clamp(s, 0.001, 0.999);
}

export function probBTTSNo(lambdaHome, lambdaAway) {
  const pH0 = poissonP(0, lambdaHome);
  const pA0 = poissonP(0, lambdaAway);
  // P(H=0 OR A=0) = P(H=0)+P(A=0)-P(H=0,A=0)
  const p = pH0 + pA0 - pH0 * pA0;
  return clamp(p, 0.001, 0.999);
}

export function scoreMatrix(lambdaHome, lambdaAway, maxG = 6) {
  const mat = [];
  for (let h = 0; h <= maxG; h++) {
    const row = [];
    for (let a = 0; a <= maxG; a++) row.push(poissonP(h, lambdaHome) * poissonP(a, lambdaAway));
    mat.push(row);
  }
  return mat;
}

export function probs1X2(lambdaHome, lambdaAway) {
  const mat = scoreMatrix(lambdaHome, lambdaAway, 6);
  let pH = 0, pD = 0, pA = 0;
  for (let h = 0; h < mat.length; h++) {
    for (let a = 0; a < mat[h].length; a++) {
      const p = mat[h][a];
      if (h > a) pH += p;
      else if (h === a) pD += p;
      else pA += p;
    }
  }
  // renormaliza por truncamiento
  const s = pH + pD + pA;
  if (s > 0) {
    pH /= s; pD /= s; pA /= s;
  }
  return { home: clamp(pH, 0.001, 0.999), draw: clamp(pD, 0.001, 0.999), away: clamp(pA, 0.001, 0.999) };
}

export function probsDoubleChance(lambdaHome, lambdaAway) {
  const p = probs1X2(lambdaHome, lambdaAway);
  return {
    home_draw: clamp(p.home + p.draw, 0.001, 0.999), // 1X
    home_away: clamp(p.home + p.away, 0.001, 0.999), // 12
    draw_away: clamp(p.draw + p.away, 0.001, 0.999), // X2
  };
}

// =====================
// Calidad de datos (racha)
// =====================

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

function summarizeLast5(last5) {
  // last5 esperado: { home: "WDLWW", away:"LDW.." } o similar
  if (!last5) return null;
  const s = typeof last5 === "string" ? last5 : null;
  if (s && s.length >= 3) {
    const arr = s.toUpperCase().split("").slice(-5);
    return { W: arr.filter(x => x === "W").length, D: arr.filter(x => x === "D").length, L: arr.filter(x => x === "L").length, total: arr.length };
  }
  const home = typeof last5?.home === "string" ? last5.home : null;
  const away = typeof last5?.away === "string" ? last5.away : null;
  return { home, away };
}

function formQuality(pack) {
  const l5 = extractLast5(pack);
  const hasHome = typeof l5?.home === "string" && l5.home.length >= 3;
  const hasAway = typeof l5?.away === "string" && l5.away.length >= 3;
  return { full: hasHome && hasAway };
}

function applyConfidence(p, confidence) {
  // p -> (0.5 + (p-0.5)*confidence) para encoger hacia 0.5 cuando la data es parcial
  const pp = clamp(Number(p), 0.001, 0.999);
  const c = clamp(Number(confidence), 0.2, 1);
  return clamp(0.5 + (pp - 0.5) * c, 0.001, 0.999);
}

// =====================
// Extra signals (recent / h2h)
// =====================

function summarizeRecent(recent) {
  // recent esperado: array partidos con goals.home/goals.away OR { total: [...] }
  if (!recent) return null;
  if (Array.isArray(recent)) {
    const totals = recent
      .map((m) => {
        const gh = safeNum(m?.goals?.home ?? m?.home?.goals ?? m?.goalsForHome);
        const ga = safeNum(m?.goals?.away ?? m?.away?.goals ?? m?.goalsForAway);
        return (Number.isFinite(gh) && Number.isFinite(ga)) ? (gh + ga) : null;
      })
      .filter(Number.isFinite);
    return { total: avg(totals) };
  }
  const totals = Array.isArray(recent?.total) ? recent.total.map(Number).filter(Number.isFinite) : [];
  return { total: avg(totals) };
}

function summarizeH2H(h2h) {
  if (!h2h) return null;
  const arr = Array.isArray(h2h) ? h2h : (Array.isArray(h2h?.matches) ? h2h.matches : []);
  const totals = arr
    .map((m) => {
      const gh = safeNum(m?.goals?.home ?? m?.score?.fulltime?.home);
      const ga = safeNum(m?.goals?.away ?? m?.score?.fulltime?.away);
      return (Number.isFinite(gh) && Number.isFinite(ga)) ? (gh + ga) : null;
    })
    .filter(Number.isFinite);
  const btts = arr
    .map((m) => {
      const gh = safeNum(m?.goals?.home ?? m?.score?.fulltime?.home);
      const ga = safeNum(m?.goals?.away ?? m?.score?.fulltime?.away);
      return (Number.isFinite(gh) && Number.isFinite(ga)) ? (gh > 0 && ga > 0 ? 1 : 0) : null;
    })
    .filter((x) => x === 0 || x === 1);

  return {
    avgTotal: avg(totals),
    bttsRate: btts.length ? avg(btts) : null, // 0..1
  };
}

function probUnderFromAvgGoals(avgGoals, line) {
  const lam = safeNum(avgGoals);
  if (!Number.isFinite(lam) || lam <= 0) return null;
  return probUnderLine(lam, line);
}

function probBTTSNoFromBttsRate(rateYes) {
  const r = safeNum(rateYes);
  if (!Number.isFinite(r)) return null;
  return clamp(1 - r, 0.001, 0.999);
}

// =====================
// Lambda estimation
// =====================

export function estimateLambdasFromPack(pack) {
  // Backend puede enviar lambdas directos o stats de goles.
  const lh = safeNum(pack?.model?.lambdaHome ?? pack?.lambdaHome ?? pack?.lambdas?.home);
  const la = safeNum(pack?.model?.lambdaAway ?? pack?.lambdaAway ?? pack?.lambdas?.away);

  const gfH = safeNum(pack?.stats?.home?.gfAvg ?? pack?.home?.gfAvg);
  const gaH = safeNum(pack?.stats?.home?.gaAvg ?? pack?.home?.gaAvg);
  const gfA = safeNum(pack?.stats?.away?.gfAvg ?? pack?.away?.gfAvg);
  const gaA = safeNum(pack?.stats?.away?.gaAvg ?? pack?.away?.gaAvg);

  // fallback simple si no vienen lambdas
  const lambdaHome = Number.isFinite(lh)
    ? lh
    : (Number.isFinite(gfH) && Number.isFinite(gaA)) ? (0.55 * gfH + 0.45 * gaA) : 1.25;

  const lambdaAway = Number.isFinite(la)
    ? la
    : (Number.isFinite(gfA) && Number.isFinite(gaH)) ? (0.55 * gfA + 0.45 * gaH) : 1.05;

  const lambdaTotal = clamp(lambdaHome + lambdaAway, 0.2, 6.5);

  return { lambdaHome, lambdaAway, lambdaTotal };
}

// =====================
// Pick normalization (no contradicciones)
// =====================

function normalizePickKind(p) {
  // Retorna { group, side } para detectar contradicción.
  // group: "DC" | "OU" | "BTTS" | "OTHER"
  const market = String(p?.market || p?.marketKey || "").toUpperCase();
  const sel = String(p?.selection || "").toLowerCase();
  const label = String(p?.label || p?.pick || "").toLowerCase();

  // Double chance
  if (market.includes("DC") || label.includes("doble oportunidad")) {
    if (sel.includes("home_draw") || label.includes("1x") || label.includes("x1") || label.includes("1x")) return { group: "DC", side: "1X" };
    if (sel.includes("draw_away") || label.includes("x2") || label.includes("2x")) return { group: "DC", side: "X2" };
    if (sel.includes("home_away") || label.includes("12")) return { group: "DC", side: "12" };
    // si no se detecta, marca como OTHER
    return { group: "DC", side: "UNK" };
  }

  // Over/Under
  if (market.includes("OU") || label.includes("over") || label.includes("under")) {
    if (sel === "over" || label.includes("over")) return { group: "OU", side: "OVER" };
    if (sel === "under" || label.includes("under")) return { group: "OU", side: "UNDER" };
    return { group: "OU", side: "UNK" };
  }

  // BTTS
  if (market.includes("BTTS") || label.includes("ambos marcan")) {
    if (sel === "no" || label.includes(": no")) return { group: "BTTS", side: "NO" };
    if (sel === "yes" || sel === "si" || label.includes(": sí") || label.includes(": si")) return { group: "BTTS", side: "YES" };
    return { group: "BTTS", side: "UNK" };
  }

  return { group: "OTHER", side: "UNK" };
}

function isContradict(a, b) {
  const A = normalizePickKind(a);
  const B = normalizePickKind(b);
  if (A.group !== B.group) return false;

  if (A.group === "DC") {
    // 1X vs X2 es contradicción dura. 12 contradice "Draw" pero no lo usamos aquí.
    return (A.side === "1X" && B.side === "X2") || (A.side === "X2" && B.side === "1X");
  }

  if (A.group === "OU") {
    return (A.side === "OVER" && B.side === "UNDER") || (A.side === "UNDER" && B.side === "OVER");
  }

  if (A.group === "BTTS") {
    return (A.side === "YES" && B.side === "NO") || (A.side === "NO" && B.side === "YES");
  }

  return false;
}

// =====================
// Candidatos (con OU conservador)
// =====================

export function buildCandidatePicks({ fixture, pack, markets }) {
  // Devuelve picks candidatos con:
  // market, selection, label, prob, fvOdd, marketOdd, usedOdd, valueEdge, fixtureId, home, away

  const out = [];

  const q = formQuality(pack);
  const confidence = q.full ? 1 : 0.7;
  const dataQuality = q.full ? "full" : "partial";

  const { lambdaHome, lambdaAway, lambdaTotal } = estimateLambdasFromPack(pack);

  // mezcla total goals (recent + h2h + model)
  const recentHome = summarizeRecent(pack?.recent?.home);
  const recentAway = summarizeRecent(pack?.recent?.away);
  const h2h = summarizeH2H(pack?.h2h);

  const recentTotal =
    Number.isFinite(recentHome?.total) && Number.isFinite(recentAway?.total)
      ? (recentHome.total + recentAway.total) / 2
      : null;

  const h2hTotal = Number.isFinite(h2h?.avgTotal) ? h2h.avgTotal : null;

  const blendTotal =
    (Number.isFinite(recentTotal) ? 0.45 * recentTotal : 0) +
    (Number.isFinite(h2hTotal) ? 0.35 * h2hTotal : 0) +
    (Number.isFinite(lambdaTotal) ? 0.20 * lambdaTotal : 0);

  const usableTotal = blendTotal > 0.2 ? blendTotal : lambdaTotal;

  // base probs
  const dc = probsDoubleChance(lambdaHome, lambdaAway);

  // ====== OU conservador ======
  // regla solicitada:
  // - Si el modelo calcula Over 2.5 -> devolver Over 1.5
  // - Si el modelo calcula Under 2.5 -> devolver Under 3.5
  //
  // Para decidir si "calcula Over/Under 2.5", usamos su prob base sobre 2.5.
  const under25 = probUnderFromAvgGoals(usableTotal, 2.5) ?? probUnderLine(lambdaTotal, 2.5);
  const over25 = clamp(1 - under25, 0.001, 0.999);

  const under35 = probUnderFromAvgGoals(usableTotal, 3.5) ?? probUnderLine(lambdaTotal, 3.5);
  const under15 = probUnderFromAvgGoals(usableTotal, 1.5) ?? probUnderLine(lambdaTotal, 1.5);
  const over15 = clamp(1 - under15, 0.001, 0.999);

  // BTTS
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

  // OU conservador: solo emitimos los equivalentes "seguros"
  // - over 1.5 como alternativa conservadora al over 2.5
  out.push({
    market: "OU_15",
    selection: "over",
    label: "Over 1.5 goles",
    prob: applyConfidence(over15, confidence),
    fvOdd: fairOddFromProb(over15),
    marketOdd: markets?.OU_15?.over ?? null,
  });

  // - under 3.5 como alternativa conservadora al under 2.5
  out.push({
    market: "OU_35",
    selection: "under",
    label: "Under 3.5 goles",
    prob: applyConfidence(under35, confidence),
    fvOdd: fairOddFromProb(under35),
    marketOdd: markets?.OU_35?.under ?? null,
  });

  out.push({
    market: "BTTS",
    selection: "no",
    label: "Ambos marcan: NO",
    prob: applyConfidence(bttsNo, confidence),
    fvOdd: fairOddFromProb(bttsNo),
    marketOdd: markets?.BTTS?.no ?? null,
  });

  // ---------- limpieza + métricas ----------
  const fixtureId = Number(fixture?.fixture?.id || fixture?.id || pack?.fixtureId);
  const home = fixture?.teams?.home?.name || pack?.teams?.home?.name || "Home";
  const away = fixture?.teams?.away?.name || pack?.teams?.away?.name || "Away";

  const cleaned = out
    .filter((x) => Number.isFinite(Number(x.prob)) && Number(x.prob) > 0.01 && Number(x.prob) < 0.999)
    .map((x) => {
      const fvOddNum = Number(x.fvOdd);
      const mkOddNum = Number(x.marketOdd);

      const bestOddRaw = Number.isFinite(mkOddNum) ? mkOddNum : fvOddNum;

      const valueEdgeRaw =
        Number.isFinite(mkOddNum) && Number.isFinite(fvOddNum) && fvOddNum > 0
          ? (mkOddNum / fvOddNum) - 1
          : null;

      const probRank = applyConfidence(Number(x.prob), confidence);

      return {
        ...x,
        dataQuality,
        confidence,
        __probRank: probRank,
        fvOdd: round2(fvOddNum),
        marketOdd: Number.isFinite(mkOddNum) ? round2(mkOddNum) : null,
        usedOdd: bestOddRaw,
        usedOddDisplay: round2(bestOddRaw),
        valueEdge: valueEdgeRaw === null ? null : round2(valueEdgeRaw),
        fixtureId,
        home,
        away,
      };
    });

  // Orden: mayor rank, luego mayor prob, luego menor odd
  cleaned.sort(
    (a, b) => (Number(b.__probRank) - Number(a.__probRank)) || (Number(b.prob) - Number(a.prob)) || (Number(a.usedOdd) - Number(b.usedOdd))
  );

  return cleaned;
}

// =====================
// Bloqueo por fixture
// =====================

function bestPrimaryForFixture(list) {
  const arr = Array.isArray(list) ? list.filter(Boolean) : [];
  if (!arr.length) return null;
  // ya viene rankeado desde Comparator; si no, igual ordena por __probRank
  const sorted = [...arr].sort((a, b) => (Number(b.__probRank ?? b.prob ?? 0) - Number(a.__probRank ?? a.prob ?? 0)));
  return sorted[0] || null;
}

function lockPrimaries(candidatesByFixture) {
  const primaries = {};
  const locked = {};
  for (const [fid, list] of Object.entries(candidatesByFixture || {})) {
    const primary = bestPrimaryForFixture(list);
    if (!primary) continue;
    primaries[fid] = primary;

    // dejamos todos los candidatos, pero marcamos el "lock" para filtrar contradicciones
    locked[fid] = {
      primary,
      // candidatos compatibles con el primary (incluye el primary)
      compatible: (Array.isArray(list) ? list : []).filter((p) => !isContradict(primary, p)),
      // candidatos NO compatibles (para debug / si quisieras mostrar)
      incompatible: (Array.isArray(list) ? list : []).filter((p) => isContradict(primary, p)),
    };
  }
  return { primaries, locked };
}

function oddOf(p) {
  const o = Number(p?.usedOdd ?? p?.usedOddDisplay ?? p?.marketOdd ?? p?.fvOdd);
  return Number.isFinite(o) ? o : null;
}

function scoreOf(p, t = 5) {
  const pr = Number.isFinite(Number(p?.__probRank)) ? Number(p.__probRank) : Number(p?.prob);
  const pp = Number.isFinite(pr) ? pr : 0;
  const o = oddOf(p) ?? 1.01;
  const logO = Math.log(Math.max(1.0001, o));
  const wOdd = t >= 50 ? 0.26 : t >= 20 ? 0.20 : t >= 10 ? 0.14 : 0.10;
  return pp * (1 - wOdd) + logO * wOdd;
}

function typeOf(p) {
  const mk = String(p?.market || p?.marketKey || "").toUpperCase();
  if (mk.includes("DC")) return "DC";
  if (mk.includes("OU")) return "OU";
  if (mk.includes("BTTS")) return "BTTS";
  return "OTHER";
}

// =====================
// API pública (usada por Comparator)
// =====================

export function pickSafe(candidatesByFixture) {
  // ✅ Importante: el "seguro" sale SOLO de primaries (bloqueo por fixture).
  const { primaries } = lockPrimaries(candidatesByFixture);
  const all = Object.values(primaries).filter(Boolean);
  all.sort((a, b) => (Number(b.__probRank ?? b.prob ?? 0) - Number(a.__probRank ?? a.prob ?? 0)) || (oddOf(a) - oddOf(b)));
  return all[0] || null;
}

export function buildGiftPickBundle(candidatesByFixture, minOdd = 1.5, maxOdd = 3.0, maxLegs = 3) {
  // ✅ Solo primaries para no contradecir entre secciones.
  const { primaries } = lockPrimaries(candidatesByFixture);
  const pool = Object.values(primaries)
    .filter(Boolean)
    .map((p) => ({ ...p, __odd: oddOf(p), __rank: Number(p.__probRank ?? p.prob ?? 0) }))
    .filter((p) => Number.isFinite(p.__odd) && p.__odd > 1.0001)
    .sort((a, b) => (b.__rank - a.__rank) || (a.__odd - b.__odd));

  const legs = [];

  // 1) intento estricto
  for (const p of pool) {
    if (legs.length >= maxLegs) break;
    if (Number(p.__rank) < 0.85) continue;
    if (p.__odd < minOdd || p.__odd > maxOdd) continue;
    legs.push(p);
  }

  // 2) fallback: rellena sin dejar vacío
  if (!legs.length) {
    for (const p of pool) {
      if (legs.length >= maxLegs) break;
      legs.push(p);
    }
  }

  const prod = legs.reduce((acc, x) => acc * (oddOf(x) || 1), 1);
  return {
    games: legs.length,
    finalOdd: round2(prod),
    impliedProb: prod > 1 ? round2(1 / prod) : null,
    legs,
    picks: legs,
  };
}

export function buildValueList(candidatesByFixture, minEdge = 0.06) {
  // Value list puede usar todos los candidatos, pero excluye picks que contradicen
  // al primary de su fixture (para mantener credibilidad).
  const { locked } = lockPrimaries(candidatesByFixture);

  const all = Object.entries(locked).flatMap(([fid, info]) => {
    const compatible = info?.compatible || [];
    return compatible.map((p) => ({ ...p, __fx: fid }));
  });

  const value = all
    .filter((x) => Number.isFinite(Number(x.marketOdd)) && Number.isFinite(Number(x.fvOdd)))
    .map((x) => {
      const mk = Number(x.marketOdd);
      const fv = Number(x.fvOdd);
      const edge = fv > 0 ? (mk / fv) - 1 : null;
      return { ...x, valueEdge: edge === null ? null : round2(edge) };
    })
    .filter((x) => Number.isFinite(x.valueEdge) && x.valueEdge >= minEdge && Number(x.__probRank ?? x.prob ?? 0) >= 0.78)
    .sort((a, b) => b.valueEdge - a.valueEdge);

  return value.slice(0, 12);
}

// =====================
// Parlays (escalables + multi-leg por fixture si aplica)
// =====================

export function buildParlay({ candidatesByFixture, target, cap, maxLegs = 18 }) {
  const t = Number(target);
  const hardCap = Number(cap);

  if (!Number.isFinite(t) || t <= 1) return null;
  if (!Number.isFinite(hardCap) || hardCap <= 1) return null;

  const { locked } = lockPrimaries(candidatesByFixture);

  // Pool por fixture: primary + compatibles top
  const byFx = Object.entries(locked)
    .map(([fid, info]) => {
      const primary = info?.primary;
      const compat = Array.isArray(info?.compatible) ? info.compatible : [];
      if (!primary) return null;

      // Ordena compatibles por score (para escoger 2do leg si hace sentido)
      const options = [...compat]
        .map((p) => ({
          ...p,
          __fx: fid,
          __odd: oddOf(p),
          __type: typeOf(p),
          __score: scoreOf(p, t),
          __rank: Number(p.__probRank ?? p.prob ?? 0),
        }))
        .filter((p) => Number.isFinite(p.__odd) && p.__odd > 1.0001)
        .sort((a, b) => (b.__score - a.__score));

      // si el primary no tiene odd usable, el fixture no sirve
      if (!options.length) return null;

      return { fid, primary: options[0], options };
    })
    .filter(Boolean);

  if (!byFx.length) return null;

  // Parámetros dinámicos
  const many = byFx.length >= 18;
  const minProb =
    t <= 5 ? 0.72 :
    t <= 10 ? 0.69 :
    t <= 20 ? 0.66 :
    t <= 50 ? 0.63 :
    0.60;

  // cuando hay MUCHOS partidos, permitimos más legs (si no, se queda "corto")
  const dynamicMaxLegs = clamp(Number(maxLegs), 6, many ? 26 : 20);

  // minimo legs: si el target es alto, fuerza más legs para “escalar”
  const minLegs =
    byFx.length < 2 ? 1 :
    t <= 5 ? 3 :
    t <= 10 ? 4 :
    t <= 20 ? 5 :
    t <= 50 ? 7 :
    9;

  // límites suaves por tipo (evita que todo sea BTTS/Under)
  const perTypeLimit = {
    DC: many ? 7 : 5,
    OU: many ? 8 : 6,
    BTTS: 2,
    OTHER: 4,
  };

  function canAddType(typeCount, typ) {
    return (typeCount[typ] || 0) < (perTypeLimit[typ] ?? 99);
  }

  // Greedy 1: agrega un pick por fixture (primaries) hasta acercarse al target
  const legs = [];
  const usedByFixture = {}; // fid -> [legs]
  const typeCount = { DC: 0, OU: 0, BTTS: 0, OTHER: 0 };
  let prod = 1;

  // Ordena fixtures por mejor score (más confiables primero) pero deja espacio para subir odds
  byFx.sort((a, b) => (b.primary.__score - a.primary.__score));

  for (const fx of byFx) {
    if (legs.length >= dynamicMaxLegs) break;

    const cand = fx.primary;
    const pOk = Number.isFinite(cand.__rank) ? cand.__rank : 0;
    if (pOk < minProb) continue;

    if (!canAddType(typeCount, cand.__type)) continue;

    const next = prod * cand.__odd;
    if (next > hardCap * 1.02) continue;

    legs.push(cand);
    usedByFixture[fx.fid] = [cand];
    typeCount[cand.__type] = (typeCount[cand.__type] || 0) + 1;
    prod = next;

    // no cortes demasiado temprano: fuerza crecer legs para targets altos o muchos fixtures
    const closeEnough = prod >= t * 0.97;
    const legsEnough = legs.length >= minLegs;

    if (closeEnough && legsEnough && !many) break;
    if (closeEnough && legsEnough && many && t <= 10) break;
  }

  // Greedy 2: si no alcanza target (o faltan legs), agrega más fixtures (aunque pOk baje un poco)
  if (legs.length < minLegs || prod < t * 0.90) {
    for (const fx of byFx) {
      if (legs.length >= dynamicMaxLegs) break;
      if (usedByFixture[fx.fid]) continue;

      // toma la mejor opción que cumpla mínimos (relaja un poco)
      const opt = fx.options.find((c) => {
        const pOk = Number.isFinite(c.__rank) ? c.__rank : 0;
        if (pOk < (minProb - 0.06)) return false;
        if (!canAddType(typeCount, c.__type)) return false;
        const next = prod * c.__odd;
        if (next > hardCap * 1.02) return false;
        return true;
      });

      if (!opt) continue;

      legs.push(opt);
      usedByFixture[fx.fid] = [opt];
      typeCount[opt.__type] = (typeCount[opt.__type] || 0) + 1;
      prod *= opt.__odd;

      const closeEnough = prod >= t * 0.97;
      const legsEnough = legs.length >= minLegs;
      if (closeEnough && legsEnough) break;
    }
  }

  // Greedy 3: permite 2do leg por fixture (solo si es compatible con el primary)
  // Útil cuando hay pocos fixtures o targets altos.
  const canUseSecondLeg = (byFx.length <= 10) || (t >= 20) || (legs.length < minLegs);

  if (canUseSecondLeg && legs.length < dynamicMaxLegs && (prod < t * 0.95 || legs.length < minLegs)) {
    // ordena fixtures ya usados por "potencial" del segundo leg
    const usedFids = Object.keys(usedByFixture);
    const fxIndex = new Map(byFx.map((x) => [String(x.fid), x]));
    for (const fid of usedFids) {
      const fx = fxIndex.get(String(fid));
      if (!fx) continue;

      if (legs.length >= dynamicMaxLegs) break;

      const first = usedByFixture[fid]?.[0];
      if (!first) continue;

      // toma un candidato compatible adicional (no contradictorio con first) y con buen rank
      const second = fx.options.find((c) => {
        if (c === first) return false;
        if (isContradict(first, c)) return false;
        const pOk = Number.isFinite(c.__rank) ? c.__rank : 0;
        if (pOk < (minProb - 0.02)) return false;
        const next = prod * c.__odd;
        if (next > hardCap * 1.02) return false;
        // evita duplicar tipo excesivamente
        if (!canAddType(typeCount, c.__type)) return false;
        return true;
      });

      if (!second) continue;

      legs.push(second);
      usedByFixture[fid].push(second);
      typeCount[second.__type] = (typeCount[second.__type] || 0) + 1;
      prod *= second.__odd;

      const closeEnough = prod >= t * 0.97;
      const legsEnough = legs.length >= minLegs;
      if (closeEnough && legsEnough) break;
    }
  }

  // Fallback final: si aun queda vacío, toma el mejor primary posible (single) para no dejar sección vacía
  if (!legs.length) {
    const best = byFx[0]?.primary;
    if (best && Number.isFinite(best.__odd)) {
      legs.push(best);
      prod = best.__odd;
    }
  }

  // Normaliza a mínimo 1 leg (para secciones x50/x100 con pool chico)
  const finalLegs = legs.slice(0, dynamicMaxLegs);
  const finalProd = finalLegs.reduce((acc, x) => acc * (oddOf(x) || 1), 1);

  return {
    target: t,
    cap: hardCap,
    games: finalLegs.length,
    finalOdd: round2(finalProd),
    impliedProb: finalProd > 1 ? round2(1 / finalProd) : null,
    legs: finalLegs,
    picks: finalLegs,
    reached: finalProd >= t * 0.90,
  };
}

// =====================
// (Opcional) Engine único para UI
// =====================

export function buildFvOutput({ candidatesByFixture, maxBoost = 100 }) {
  const safe = pickSafe(candidatesByFixture);
  const giftBundle = buildGiftPickBundle(candidatesByFixture, 1.5, 3.0, 3);
  const valueList = buildValueList(candidatesByFixture, 0.06);

  const targets = [3, 5, 10, 20, 50, 100].filter((t) => t <= Number(maxBoost || 100));
  const parlays = targets.map((t) => buildParlay({ candidatesByFixture, target: t, cap: Number(maxBoost || 100), maxLegs: 18 })).filter(Boolean);

  return { safe, giftBundle, valueList, targets, parlays };
}
