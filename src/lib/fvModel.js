// FV_MODEL_VERSION: 2026-02-16-aggressive-consistency-v1
// src/lib/fvModel.js
// Motor MVP de probabilidades + armado de parlays para Factor Victoria.
// Objetivo: simple, interpretable, con fallbacks (si no hay odds o stats).

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function round2(n) {
  var x = Number(n);
  return Number.isFinite(x) ? Number(x.toFixed(2)) : null;
}

function avg(arr) {
  if (!arr?.length) return null;
  var s = arr.reduce((a, b) => a + b, 0);
  return s / arr.length;
}

function safeNum(n) {
  var x = Number(n);
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
  var parts = s.split(/\s*[-|\s]\s*/).filter(Boolean);
  if (parts.length < 3) return false;
  return parts.every((t) => {
    var u = String(t).trim().toUpperCase();
    return ["W", "D", "L", "G", "E", "P"].includes(u);
  });
}

function formQuality(pack) {
  var last5 = extractLast5(pack);
  var homeForm = last5?.home?.form || last5?.local?.form || last5?.home?.display || last5?.local?.display || null;
  var awayForm = last5?.away?.form || last5?.visitor?.form || last5?.away?.display || last5?.visitor?.display || null;
  var hasHome = hasValidFormStr(homeForm);
  var hasAway = hasValidFormStr(awayForm);
  return { hasHome, hasAway, full: hasHome && hasAway, homeForm, awayForm };
}

function applyConfidence(p, multiplier) {
  // shrink toward 0.5 to be conservative when data is partial
  var prob = Number(p);
  if (!Number.isFinite(prob)) return prob;
  var m = clamp(Number(multiplier), 0, 1);
  return clamp(0.5 + (prob - 0.5) * m, 0.01, 0.99);
}


function pr(c) {
  var v = Number(c?.__probRank);
  if (Number.isFinite(v)) return v;
  var p = Number(c?.prob);
  return Number.isFinite(p) ? p : 0;
}

function qRank(p) {
  return p?.dataQuality?.isComplete ? 1 : 0;
}


// stats: [{gf, ga}] últimos partidos
function summarizeRecent(list) {
  if (!Array.isArray(list) || !list.length) return null;
  var gf = avg(list.map((x) => safeNum(x.gf) ?? 0));
  var ga = avg(list.map((x) => safeNum(x.ga) ?? 0));
  var total = (gf ?? 0) + (ga ?? 0);
  return { gf: gf ?? 0, ga: ga ?? 0, total };
}

// h2h: [{hg, ag}]
function summarizeH2H(list) {
  if (!Array.isArray(list) || !list.length) return null;
  var totals = list.map((x) => (safeNum(x.hg) ?? 0) + (safeNum(x.ag) ?? 0));
  var btts = list.map((x) =>
    (safeNum(x.hg) ?? 0) > 0 && (safeNum(x.ag) ?? 0) > 0 ? 1 : 0
  );
  return {
    avgTotal: avg(totals) ?? null,
    bttsRate: avg(btts) ?? null,
  }
}

function probUnderFromAvgGoals(avgGoals, line) {
  if (!Number.isFinite(avgGoals)) return null;
  var diff = line - avgGoals; // positivo = favorece Under
  var p = 1 / (1 + Math.exp(-1.4 * diff));
  return clamp(p, 0.05, 0.95);
}

function probBTTSNoFromBttsRate(bttsRate) {
  if (!Number.isFinite(bttsRate)) return null;
  return clamp(1 - bttsRate, 0.05, 0.95);
}

export function fairOddFromProb(p) {
  var pp = clamp(Number(p || 0), 1e-6, 0.999999);
  return 1 / pp;
}

function factorial(n) {
  var x = 1;
  for (var i = 2; i <= n; i++) x *= i;
  return x;
}

function poissonP(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

export function probUnderLine(lambdaTotal, line) {
  var maxGoals = 10;
  var thr = Math.floor(Number(line)); // 3.5 -> 3
  var s = 0;
  for (var g = 0; g <= maxGoals; g++) {
    var p = poissonP(g, lambdaTotal);
    if (g <= thr) s += p;
  }
  return clamp(s, 0, 1);
}

export function probBTTSNo(lambdaHome, lambdaAway) {
  var pH0 = poissonP(0, lambdaHome);
  var pA0 = poissonP(0, lambdaAway);
  var pBoth0 = pH0 * pA0;
  return clamp(pH0 + pA0 - pBoth0, 0, 1);
}

export function scoreMatrix(lambdaHome, lambdaAway, maxG = 6) {
  var mat = [];
  for (var i = 0; i <= maxG; i++) {
    for (var j = 0; j <= maxG; j++) {
      mat.push({ hg: i, ag: j, p: poissonP(i, lambdaHome) * poissonP(j, lambdaAway) });
    }
  }
  return mat;
}

export function probs1X2(lambdaHome, lambdaAway) {
  var mat = scoreMatrix(lambdaHome, lambdaAway, 6);
  var pH = 0,
    pD = 0,
    pA = 0;
  for (var c of mat) {
    if (c.hg > c.ag) pH += c.p;
    else if (c.hg === c.ag) pD += c.p;
    else pA += c.p;
  }
  var s = pH + pD + pA;
  if (s > 0) {
    pH /= s;
    pD /= s;
    pA /= s;
  }
  return { home: clamp(pH, 0, 1), draw: clamp(pD, 0, 1), away: clamp(pA, 0, 1) };
}

export function probsDoubleChance(lambdaHome, lambdaAway) {
  var p = probs1X2(lambdaHome, lambdaAway);
  return {
    home_draw: clamp(p.home + p.draw, 0, 1),
    home_away: clamp(p.home + p.away, 0, 1),
    draw_away: clamp(p.draw + p.away, 0, 1),
  }
}

export function estimateLambdasFromPack(pack) {
  try {

  // El backend puede enviar llaves en camelCase o PascalCase.
  // Ej: { model: { LambdaHome, LambdaAway, LambdaTotal } }
  function safeNum(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function pick(...vals) {
    for (var v of vals) {
      var n = safeNum(v);
      if (n != null) return n;
    }
    return null;
  }
  var m = pack?.model || pack?.data?.model || pack?.stats?.model || null;

  var lhRaw = pick(m?.lambdaHome, m?.lambda_home, m?.homeLambda, m?.LambdaHome, m?.lambdaH);
  var laRaw = pick(m?.lambdaAway, m?.lambda_away, m?.awayLambda, m?.LambdaAway, m?.lambdaA);
  var ltRaw = pick(m?.lambdaTotal, m?.lambda_total, m?.LambdaTotal, m?.totalLambda);

  // Defaults (conservadores) si no llega modelo
  var lambdaHome = lhRaw != null ? clamp(lhRaw, 0.2, 3.2) : 1.25;
  var lambdaAway = laRaw != null ? clamp(laRaw, 0.2, 3.2) : 1.05;

  // Si llega total pero falta home/away, repartimos.
  if (ltRaw != null && (lhRaw == null || laRaw == null)) {
    var lt = clamp(ltRaw, 0.4, 6.0);
    var wH = lhRaw != null ? clamp(lhRaw / lt, 0.25, 0.75) : 0.55;
    lambdaHome = clamp(lt * wH, 0.2, 3.2);
    lambdaAway = clamp(lt - lambdaHome, 0.2, 3.2);
  }

  var lambdaTotal = clamp(lambdaHome + lambdaAway, 0.4, 6.0);
  return { lambdaHome, lambdaAway, lambdaTotal };

  } catch (e) {
    console.warn('[FV] estimateLambdasFromPack failed', e);
    return { home: 1.35, away: 1.15 };
  }
}

export function buildCandidatePicks({ fixture, pack, markets }) {
  try {

  
  // Genera picks candidatos con: market, selection, label, prob, fvOdd, marketOdd, usedOdd, valueEdge, fixtureId, home, away
  var out = [];

  // Calidad de datos: usamos la racha (W/D/L últimos 5) como señal principal.
  var q = formQuality(pack);
  var confidence = q.full ? 1 : 0.7; // si falta racha en 1+ equipos, reducimos confianza (sin bloquear)
  var dataQuality = q.full ? "full" : "partial";

  var { lambdaHome, lambdaAway, lambdaTotal } = estimateLambdasFromPack(pack);

  // --- NUEVO: forma + h2h ---
  var recentHome = summarizeRecent(pack?.recent?.home);
  var recentAway = summarizeRecent(pack?.recent?.away);
  var h2h = summarizeH2H(pack?.h2h);

  var recentTotal =
    Number.isFinite(recentHome?.total) && Number.isFinite(recentAway?.total)
      ? (recentHome.total + recentAway.total) / 2
      : null;

  var h2hTotal = Number.isFinite(h2h?.avgTotal) ? h2h.avgTotal : null;

  // Mezcla final de goles esperados (para Under/Over)
  var blendTotal =
    (Number.isFinite(recentTotal) ? 0.45 * recentTotal : 0) +
    (Number.isFinite(h2hTotal) ? 0.35 * h2hTotal : 0) +
    (Number.isFinite(lambdaTotal) ? 0.20 * lambdaTotal : 0);

  var usableTotal = blendTotal > 0.2 ? blendTotal : lambdaTotal;

  // probabilidades base
  var dc = probsDoubleChance(lambdaHome, lambdaAway);

  var under35_h = probUnderFromAvgGoals(usableTotal, 3.5);
  var under25_h = probUnderFromAvgGoals(usableTotal, 2.5);
  var under15_h = probUnderFromAvgGoals(usableTotal, 1.5);

  // fallback: si heurística da null, usa Poisson
  var under35 = under35_h ?? probUnderLine(lambdaTotal, 3.5);
  var under25 = under25_h ?? probUnderLine(lambdaTotal, 2.5);
  var under15 = under15_h ?? probUnderLine(lambdaTotal, 1.5);

  var over25 = clamp(1 - under25, 0.01, 0.99);
  var over15 = clamp(1 - under15, 0.01, 0.99);

  var bttsNo_h = probBTTSNoFromBttsRate(h2h?.bttsRate);
  var bttsNo = bttsNo_h ?? probBTTSNo(lambdaHome, lambdaAway);

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
  var cleaned = out
  .filter((x) => Number.isFinite(x.prob) && pr(x) > 0.01 && pr(x) < 0.999)
  .map((x) => {
    var fvOddNum = Number(x.fvOdd);
    var mkOddNum = Number(x.marketOdd);

    var bestOddRaw = Number.isFinite(mkOddNum) ? mkOddNum : fvOddNum;

    var valueEdgeRaw =
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

  } catch (e) {
    console.warn('[FV] buildCandidatePicks failed', e);
    return [];
  }
}
// =====================
// Helpers de armado FV
// =====================

export function pickSafe(candidatesByFixture) {
  var all = Object.values(candidatesByFixture || {}).flat();
  all.sort((a, b) => (qRank(b) - qRank(a)) || (pr(b) - pr(a)) || (Number(a.usedOdd) - Number(b.usedOdd)));
  return all[0] || null;
}

export function buildGiftPickBundle(candidatesByFixture, minOdd = 1.5, maxOdd = 3.0, maxLegs = 3) {
  var pool = Object.values(candidatesByFixture || {})
    .map((list) => (list || [])[0])
    .filter(Boolean)
    .filter((x) => Number.isFinite(x.prob) && pr(x) >= 0.85)
    .filter((x) => {
      var odd = Number(x.usedOdd);
      return Number.isFinite(odd) && odd > 1;
    });

  pool.sort((a, b) => (qRank(b) - qRank(a)) || (pr(b) - pr(a)) || (Number(a.usedOdd) - Number(b.usedOdd)));

  var legs = [];
  var prod = 1;

  for (var cand of pool) {
    if (legs.some((l) => l.fixtureId === cand.fixtureId)) continue;

    var odd = Number(cand.usedOdd);
    if (!Number.isFinite(odd) || odd <= 1) continue;

    var next = prod * odd;
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

export function buildParlay({ candidatesByFixture, target, cap, maxLegs = 30, context = null }) {
  try {
    var t = Number(target);
    var hardCap = Number(cap);

    if (!Number.isFinite(t) || t <= 1) return null;
    if (!Number.isFinite(hardCap) || hardCap <= 1) return null;

    // ===== Config por target =====
    var minLegs = t >= 100 ? 7 : t >= 50 ? 6 : t >= 20 ? 4 : 2;
    // Nota: los targets altos necesitan más legs para llegar sin inventar
    var desiredUnique =
      t >= 100 ? 10 :
      t >= 50  ? 8  :
      t >= 20  ? 6  :
      4;

    // prob mínimo base (se auto-ajusta si el pool queda chico)
    var baseMinProb =
      t <= 5  ? 0.72 :
      t <= 10 ? 0.66 :
      t <= 20 ? 0.60 :
      t <= 50 ? 0.55 :
      0.52;

    // booster min prob (para picks agresivos compatibles)
    var boosterMinProb =
      t >= 100 ? 0.49 :
      t >= 50  ? 0.51 :
      t >= 20  ? 0.53 :
      0.56;

    // tipos para limitar monocultivo (pero sin bloquear escalamiento)
    var perTypeLimitBase = {
      DC: t >= 50 ? 8 : 6,     // 1X/X2
      OU: t >= 50 ? 10 : 7,    // Under/Over
      BTTS: t >= 50 ? 3 : 2,   // permitir más variedad
      OTHER: 3,
    };

    function typeOf(p) {
      var mk = String(p?.market || p?.marketKey || "").toUpperCase();
      if (mk === "DC" || mk.includes("DC")) return "DC";
      if (mk.includes("OU")) return "OU";
      if (mk.includes("BTTS")) return "BTTS";
      return "OTHER";
    }

    function oddOf(p) {
      var o = Number(p?.usedOdd ?? p?.usedOddDisplay ?? p?.marketOdd ?? p?.fvOdd);
      return Number.isFinite(o) ? o : null;
    }

    function probOf(p) {
      var prk = Number(p?.__probRank);
      var p0 = Number.isFinite(prk) ? prk : Number(p?.prob);
      return Number.isFinite(p0) ? p0 : 0;
    }

    function isAggressivePick(p) {
      var mk = String(p?.market || "").toUpperCase();
      var sel = String(p?.selection || "").toLowerCase();
      if (mk === "OU_25" && sel === "over") return true;
      if (mk === "BTTS" && sel === "yes") return true;
      return false;
    }

    // Score: prob + incentivo de odds + penalización por repetición (context)
    function scoreOf(p) {
      var pp = probOf(p);
      var o = oddOf(p) ?? 1.0001;
      var logO = Math.log(Math.max(1.0001, o));

      // más agresivo en targets altos
      var wOdd = t >= 100 ? 0.60 : t >= 50 ? 0.52 : t >= 20 ? 0.40 : t >= 10 ? 0.22 : 0.12;

      // bonus suave para picks "agresivos" SOLO en targets altos
      var bonus = (t >= 20 && isAggressivePick(p)) ? 0.05 : 0;

      // penaliza fixtures ya usados en otros targets (evita que todo salga con 2 partidos)
      var usagePenalty = 0;
      if (context?.usedFixtureCounts) {
        var fid = String(p?.fixtureId ?? p?.__fx ?? "");
        var usedN = Number(context.usedFixtureCounts[fid] ?? 0);
        // cada uso previo resta score
        usagePenalty = usedN * 0.08;
      }

      return (pp * (1 - wOdd)) + (logO * wOdd) + bonus - usagePenalty;
    }

    // ===== Compatibilidad / bloqueo por fixture =====
    function fam(p) {
      var mk = String(p?.market || "").toUpperCase();
      if (mk === "DC" || mk.includes("DC")) return "DC";
      if (mk.includes("OU")) return "OU";
      if (mk.includes("BTTS")) return "BTTS";
      return "OTHER";
    }

    function isContradict(a, b) {
      if (!a || !b) return false;
      var fa = fam(a), fb = fam(b);
      if (fa !== fb) return false;

      // DC: 1X vs X2 se contradicen; mismo selection es ok
      if (fa === "DC") return String(a.selection) !== String(b.selection);

      // OU: over vs under se contradicen; (aunque cambie línea)
      if (fa === "OU") {
        var sa = String(a.selection);
        var sb = String(b.selection);
        if (sa === sb) return false;
        return true;
      }

      // BTTS: yes vs no se contradicen
      if (fa === "BTTS") return String(a.selection) !== String(b.selection);

      return false;
    }

    // locking: si el primary del fixture es DC => prohibe DC contrario en TODAS las secciones
    function primaryLockForFixture(list) {
      var arr = (list || []).filter(Boolean);
      if (!arr.length) return null;

      // preferimos DC como primary si existe (para evitar "Monaco gana" en una y "PSG no pierde" en otra)
      var dc = arr.filter((p) => fam(p) === "DC");
      var base = dc.length ? dc : arr;

      // mayor prob (y luego menor odd) como primary estable
      base = base
        .map((p) => ({ p, pp: probOf(p), oo: oddOf(p) ?? 99 }))
        .sort((a, b) => (b.pp - a.pp) || (a.oo - b.oo));

      return base[0]?.p || null;
    }

    // ===== arma opciones por fixture (filtra por lock + score) =====
    var rawFx = Object.entries(candidatesByFixture || {})
      .map(([fid, list]) => {
        var lock = primaryLockForFixture(list);
        var lockFam = lock ? fam(lock) : null;

        var arr = (list || [])
          .filter(Boolean)
          .filter((p) => {
            var o = oddOf(p);
            return Number.isFinite(o) && o > 1.0001;
          })
          // bloqueo de contradicción por familia con el primary
          .filter((p) => {
            if (!lock || !lockFam) return true;
            if (fam(p) !== lockFam) return true; // OU puede convivir con DC, etc.
            // misma familia => solo permitir misma selección del lock
            return String(p.selection) === String(lock.selection);
          })
          .map((p) => ({
            ...p,
            __type: typeOf(p),
            __odd: oddOf(p),
            __probRank: Number.isFinite(Number(p?.__probRank)) ? Number(p.__probRank) : Number(p?.prob),
            __fx: String(fid),
          }));

        // si quedó vacío por lock raro, cae al primero original
        if (!arr.length && lock) {
          arr = [{
            ...lock,
            __type: typeOf(lock),
            __odd: oddOf(lock),
            __probRank: probOf(lock),
            __fx: String(fid),
          }];
        }

        // score depende del target y del contexto
        arr = arr
          .map((p) => ({ ...p, __score: scoreOf(p) }))
          .sort((a, b) => (b.__score - a.__score));

        var topN = arr.slice(0, 6);
        if (!topN.length) return null;
        return { fid: String(fid), options: topN };
      })
      .filter(Boolean);

    if (rawFx.length < minLegs) return null;

    // ===== auto-ajuste de minProb para evitar "solo 2 fixtures" =====
    var minProb = baseMinProb;
    function fixturesWithAnyAbove(th) {
      var n = 0;
      for (var fx of rawFx) {
        if ((fx.options || []).some((p) => probOf(p) >= th)) n++;
      }
      return n;
    }

    var tries = 0;
    while (tries < 6) {
      var ok = fixturesWithAnyAbove(minProb);
      if (ok >= Math.min(desiredUnique, rawFx.length)) break;
      minProb = Math.max(0.45, minProb - 0.03);
      tries++;
    }

    // ordenar fixtures por mejor opción (pero ya con score target-aware)
    var byFx = rawFx.slice().sort((a, b) => ((b.options?.[0]?.__score ?? 0) - (a.options?.[0]?.__score ?? 0)));

    // ===== greedy principal =====
    function buildWithLimits(perTypeLimit, allowLowProb) {
      var legs = [];
      var typeCount = { DC: 0, OU: 0, BTTS: 0, OTHER: 0 };
      var prod = 1;

      for (var fx of byFx) {
        var picked = null;

        // preferimos el primer candidato que cumpla reglas
        for (var cand of (fx.options || [])) {
          var pOk = probOf(cand);
          if (!allowLowProb && pOk < minProb) continue;

          var typ = cand.__type || "OTHER";
          if ((typeCount[typ] || 0) >= (perTypeLimit[typ] ?? 99)) continue;

          var next = prod * cand.__odd;
          if (next > hardCap * 1.02) continue;

          picked = cand;
          break;
        }

        if (!picked) continue;

        legs.push(picked);
        typeCount[picked.__type] = (typeCount[picked.__type] || 0) + 1;
        prod *= picked.__odd;

        if (legs.length >= maxLegs) break;
        if (prod >= t * 0.96 && legs.length >= minLegs) break;
      }

      if (legs.length < minLegs) return null;
      return { legs, prod, typeCount };
    }

    var attempt = buildWithLimits(perTypeLimitBase, false);

    if (!attempt || attempt.prod < t * 0.85) {
      var relaxed = { ...perTypeLimitBase, DC: perTypeLimitBase.DC + 2, OU: perTypeLimitBase.OU + 2, BTTS: perTypeLimitBase.BTTS + 1, OTHER: perTypeLimitBase.OTHER + 2 };
      attempt = buildWithLimits(relaxed, true) || attempt;
    }

    if (!attempt) return null;

    // ===== boosters: 2 legs por fixture (compatibles) =====
    var maxPerFixture = t >= 20 ? 2 : 1;

    function canAdd(extra, currentLegs) {
      if (!extra) return false;
      var fx = String(extra.__fx ?? extra.fixtureId ?? "");
      var same = currentLegs.filter((l) => String(l.__fx ?? l.fixtureId ?? "") === fx);
      if (same.length >= maxPerFixture) return false;

      // no permitir contradicción con legs existentes del mismo fixture
      for (var s of same) {
        if (isContradict(s, extra) || isContradict(extra, s)) return false;
      }
      // no repetir exacto mismo mercado+selection
      if (same.some((l) => String(l.market) === String(extra.market) && String(l.selection) === String(extra.selection))) return false;

      return true;
    }

    var legs2 = attempt.legs.slice();
    var prod2 = attempt.prod;

    if (t >= 20 && prod2 < t * 0.98) {
      // boosters ordenados por odds (desc) pero con prob mínima booster
      var allOpts = byFx.flatMap((fx) => (fx.options || []).map((o) => o));
      allOpts = allOpts
        .filter(Boolean)
        .filter((c) => probOf(c) >= boosterMinProb)
        .sort((a, b) => (b.__odd - a.__odd) || (b.__score - a.__score));

      for (var cand of allOpts) {
        if (prod2 >= t * 0.99) break;
        if (!canAdd(cand, legs2)) continue;

        var next = prod2 * cand.__odd;
        if (next > hardCap * 1.02) continue;

        legs2.push(cand);
        prod2 = next;

        if (legs2.length >= maxLegs) break;
      }
    }

    // Actualiza context para siguiente target (si lo usan)
    if (context?.usedFixtureCounts) {
      for (var l of legs2) {
        var fid2 = String(l.fixtureId ?? l.__fx ?? "");
        context.usedFixtureCounts[fid2] = Number(context.usedFixtureCounts[fid2] ?? 0) + 1;
      }
    }

    return {
      target: t,
      cap: hardCap,
      games: legs2.length,
      finalOdd: round2(prod2),
      impliedProb: round2(1 / prod2),
      legs: legs2,
      picks: legs2,
      reached: prod2 >= t * 0.90,
    };
  } catch (e) {
    console.warn("[FV] buildParlay failed", e);
    return { target: target || 0, cap: cap || 0, games: 0, finalOdd: null, impliedProb: null, legs: [], picks: [], reached: false };
  }
}

export function buildValueList(candidatesByFixture, minEdge = 0.06) {
  var all = Object.values(candidatesByFixture || {}).flat();

  var value = all
    .filter((x) => Number.isFinite(Number(x.marketOdd)) && Number.isFinite(Number(x.fvOdd)))
    .map((x) => {
      var mk = Number(x.marketOdd);
      var fv = Number(x.fvOdd);
      var edge = fv > 0 ? (mk / fv) - 1 : null;
      return { ...x, valueEdge: edge === null ? null : round2(edge) };
    })
    .filter((x) => Number.isFinite(x.valueEdge) && x.valueEdge >= minEdge && pr(x) >= 0.80)
    .sort((a, b) => b.valueEdge - a.valueEdge);

  return value.slice(0, 12);
}