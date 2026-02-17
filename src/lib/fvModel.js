// FV_MODEL_VERSION: aggressive-targetaware-v7-fixed
// Goal: aggressive parlays that can reach x50/x100 with limited fixtures,
// while keeping reasonable probability and avoiding contradictions.
// This file is self-contained (no deps) and exports buildCandidatePicks + buildFvOutput.

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function round2(n){ const x = Number(n); return Number.isFinite(x) ? Number(x.toFixed(2)) : null; }
function round3(n){ const x = Number(n); return Number.isFinite(x) ? Number(x.toFixed(3)) : null; }
function safeNum(x){ const n = Number(x); return Number.isFinite(n) ? n : null; }

const TARGETS = [3,5,10,20,50,100];

// Dynamic minProb by target (looser for higher targets)
const MIN_PROB_BY_TARGET = {
  3: 0.78,
  5: 0.74,
  10: 0.70,
  20: 0.66,
  50: 0.60,
  100: 0.55,
};

const MIN_LEGS_BY_TARGET = {
  3: 2,
  5: 3,
  10: 4,
  20: 5,
  50: 8,
  100: 10,
};

const MAX_LEGS_BY_TARGET = {
  3: 4,
  5: 6,
  10: 8,
  20: 10,
  50: 14,
  100: 16,
};

function pickLabelToKey(label){
  const s = String(label||"").toLowerCase();
  if (s.includes("1x") || s.includes("doble oportunidad 1x")) return "dc_1x";
  if (s.includes("x2") || s.includes("doble oportunidad x2")) return "dc_x2";
  if (s.includes("12") || s.includes("doble oportunidad 12")) return "dc_12";
  if (s.includes("ambos marcan") && s.includes("sí")) return "btts_yes";
  if (s.includes("ambos marcan") && s.includes("no")) return "btts_no";
  if (s.includes("over") || s.includes("más de")) return "over";
  if (s.includes("under") || s.includes("menos de")) return "under";
  if (s.includes("gana") || s.includes("1") || s.includes("2")) return "winner";
  return "other";
}

// --- Odds extraction helpers ---
// We try to support multiple API shapes. We only need a best odd per market/pick.
function extractBestOddFromOddsPayload(oddsPayload){
  // Return: map { marketName: { pickLabel: odd } }
  const out = {};
  if (!oddsPayload) return out;

  // Shape A: { bookmakers:[{bets:[{name, values:[{value, odd}]}]}] }
  if (oddsPayload.bookmakers && Array.isArray(oddsPayload.bookmakers)) {
    for (const bk of oddsPayload.bookmakers) {
      for (const bet of (bk.bets || [])) {
        const mName = bet.name || bet.key || bet.id || "Market";
        if (!out[mName]) out[mName] = {};
        for (const v of (bet.values || [])) {
          const lab = v.value ?? v.label ?? v.name;
          const odd = safeNum(v.odd ?? v.price ?? v.valueOdd);
          if (!lab || !odd) continue;
          const prev = out[mName][lab];
          if (!prev || odd > prev) out[mName][lab] = odd;
        }
      }
    }
    return out;
  }

  // Shape B: already normalized { [market]: { [pick]: odd } }
  if (typeof oddsPayload === "object") {
    for (const [mName, picks] of Object.entries(oddsPayload)) {
      if (!picks || typeof picks !== "object") continue;
      if (!out[mName]) out[mName] = {};
      for (const [lab, oddRaw] of Object.entries(picks)) {
        const odd = safeNum(oddRaw);
        if (!odd) continue;
        const prev = out[mName][lab];
        if (!prev || odd > prev) out[mName][lab] = odd;
      }
    }
  }
  return out;
}

function normalizeFixtureId(f){
  return f?.fixture?.id ?? f?.fixture_id ?? f?.id ?? f?.fixtureId ?? null;
}
function getTeams(f){
  const home = f?.teams?.home?.name ?? f?.home?.name ?? f?.homeTeam ?? f?.home_name ?? null;
  const away = f?.teams?.away?.name ?? f?.away?.name ?? f?.awayTeam ?? f?.away_name ?? null;
  return { home, away };
}

// --- Candidate building ---
// We build a candidate per (fixture, market pick), with:
// usedOdd: market odd
// prob: either model probability or implied probability fallback
// fvOdd: 1/prob (FV "fair" odds)
// valueEdge: (marketOdd / fvOdd) - 1 (positive means value)
function makeCandidate({fixtureId, home, away, market, pick, usedOdd, prob, partial=false}){
  const p = clamp(prob ?? (1/usedOdd), 0.02, 0.98);
  const fvOdd = 1 / p;
  const valueEdge = (usedOdd && fvOdd) ? (usedOdd / fvOdd) - 1 : null;
  return {
    fixtureId,
    home, away,
    market,
    pick,
    usedOdd: round2(usedOdd),
    prob: round3(p),
    fvOdd: round2(fvOdd),
    valueEdge: valueEdge == null ? null : round3(valueEdge),
    partial,
  };
}

function buildCandidatePicks({ fixtures=[], oddsByFixture={}, statsByFixture={}, minProb=0.68 }){
  const byFixture = {};
  for (const fx of (fixtures || [])) {
    const fixtureId = normalizeFixtureId(fx);
    if (!fixtureId) continue;
    const {home, away} = getTeams(fx);
    const oddsPayload = oddsByFixture?.[fixtureId] ?? oddsByFixture?.[String(fixtureId)];
    const best = extractBestOddFromOddsPayload(oddsPayload);
    const stats = statsByFixture?.[fixtureId] ?? statsByFixture?.[String(fixtureId)] ?? null;

    const cand = [];

    // Helper to add if odd exists
    const add = (marketName, pickLabel, odd, modelProb) => {
      if (!odd || odd < 1.01) return;
      const implied = 1 / odd;
      // If modelProb missing, use implied adjusted down a bit to account for vig
      const p = (modelProb != null && Number.isFinite(modelProb)) ? modelProb : (implied * 0.93);
      const c = makeCandidate({ fixtureId, home, away, market: marketName, pick: pickLabel, usedOdd: odd, prob: p, partial: modelProb==null });
      if ((c.prob ?? 0) >= minProb) cand.push(c);
    };

    // Market pick extraction:
    // We try common names from API-Football: "Double Chance", "Goals Over/Under", "Both Teams Score", "Match Winner"
    const pickFromMarket = (mKeys, desiredPickLabels=[]) => {
      for (const mk of mKeys) {
        const m = best[mk];
        if (!m) continue;
        for (const pl of desiredPickLabels) {
          const odd = safeNum(m[pl]);
          if (odd) return {market: mk, pick: pl, odd};
        }
      }
      return null;
    };

    // Double Chance
    {
      const res = pickFromMarket(["Double Chance","Double chance","Doble oportunidad","DoubleChance"], ["1X","X2","12"]);
      // We'll add all three if present for more options
      for (const mk of ["Double Chance","Double chance","Doble oportunidad","DoubleChance"]) {
        const m = best[mk];
        if (!m) continue;
        for (const pl of ["1X","X2","12"]) {
          const odd = safeNum(m[pl]);
          if (!odd) continue;
          // model probabilities are rarely present; if stats contain some hint, keep it simple
          add("Doble oportunidad", `Doble oportunidad ${pl}`, odd, null);
        }
      }
    }

    // Both Teams Score
    for (const mk of ["Both Teams Score","Both Teams To Score","BTTS","Ambos marcan"]) {
      const m = best[mk];
      if (!m) continue;
      const yes = safeNum(m["Yes"] ?? m["Sí"] ?? m["Si"]);
      const no = safeNum(m["No"]);
      if (yes) add("Ambos marcan", "Ambos marcan: Sí", yes, null);
      if (no) add("Ambos marcan", "Ambos marcan: NO", no, null);
    }

    // Over/Under goals (prefer higher odds lines for target-aware later)
    for (const mk of ["Goals Over/Under","Goals Over Under","Over/Under","Total Goals","Goles Más/Menos","Goles Over/Under"]) {
      const m = best[mk];
      if (!m) continue;
      const lines = ["Over 1.5","Under 1.5","Over 2.5","Under 2.5","Over 3.5","Under 3.5"];
      for (const pl of lines) {
        const odd = safeNum(m[pl]);
        if (!odd) continue;
        const label = pl.replace("Over","Over").replace("Under","Under");
        const pretty = label.replace("Over","Over").replace("Under","Under");
        add("Goles", pretty.replace(" ", " "), odd, null);
      }
    }

    // Match Winner (1X2) – these can be higher odds but riskier
    for (const mk of ["Match Winner","Match winner","1X2","Resultado Final","Winner"]) {
      const m = best[mk];
      if (!m) continue;
      const h = safeNum(m["Home"] ?? m["1"]);
      const d = safeNum(m["Draw"] ?? m["X"]);
      const a = safeNum(m["Away"] ?? m["2"]);
      if (h) add("Ganador", "Gana Local", h, null);
      if (d) add("Ganador", "Empate", d, null);
      if (a) add("Ganador", "Gana Visita", a, null);
    }

    // If nothing passed minProb, relax to allow at least odds-only candidates
    if (cand.length === 0) {
      const relaxed = [];
      const minP2 = 0.50;
      const add2 = (marketName, pickLabel, odd) => {
        if (!odd || odd < 1.01) return;
        const p = clamp((1/odd)*0.93, 0.02, 0.98);
        if (p < minP2) return;
        relaxed.push(makeCandidate({fixtureId, home, away, market: marketName, pick: pickLabel, usedOdd: odd, prob: p, partial: true}));
      };
      // add any DC / OU / BTTS
      for (const mk of Object.keys(best)) {
        const m = best[mk];
        for (const [pl, oddRaw] of Object.entries(m)) {
          const odd = safeNum(oddRaw);
          if (!odd) continue;
          const mkLower = mk.toLowerCase();
          if (mkLower.includes("double") || mkLower.includes("doble")) add2("Doble oportunidad", `Doble oportunidad ${pl}`, odd);
          if (mkLower.includes("both") || mkLower.includes("btts") || mkLower.includes("ambos")) add2("Ambos marcan", pl.includes("No") ? "Ambos marcan: NO" : "Ambos marcan: Sí", odd);
          if (mkLower.includes("over") || mkLower.includes("under") || mkLower.includes("goal") || mkLower.includes("goles")) add2("Goles", pl, odd);
        }
      }
      cand.push(...relaxed);
    }

    // Sort within fixture by "quality" (edge then prob then odd)
    cand.sort((a,b) => (b.valueEdge??0)-(a.valueEdge??0) || (b.prob??0)-(a.prob??0) || (b.usedOdd??0)-(a.usedOdd??0));
    byFixture[fixtureId] = cand.slice(0, 18);
  }
  return byFixture;
}

// --- Compatibility / contradiction rules ---
function isOver(pick){ return String(pick).toLowerCase().includes("over"); }
function isUnder(pick){ return String(pick).toLowerCase().includes("under"); }
function isBTTSYes(pick){ return String(pick).toLowerCase().includes("ambos") && String(pick).toLowerCase().includes("sí"); }
function isBTTSNo(pick){ return String(pick).toLowerCase().includes("ambos") && String(pick).toLowerCase().includes("no"); }
function isDC1X(pick){ return String(pick).toLowerCase().includes("1x"); }
function isDCX2(pick){ return String(pick).toLowerCase().includes("x2"); }
function isDC12(pick){ return String(pick).toLowerCase().includes("12"); }
function isWinnerHome(pick){ return String(pick).toLowerCase().includes("local"); }
function isWinnerAway(pick){ return String(pick).toLowerCase().includes("visita"); }
function isDraw(pick){ return String(pick).toLowerCase().includes("empate"); }

function compatible(a,b){
  // Avoid obvious contradictions
  if (a.fixtureId === b.fixtureId) {
    // only allow 2 legs per fixture and they must be compatible
    // DC contradictions
    if ((isDC1X(a.pick) && isDCX2(b.pick)) || (isDCX2(a.pick) && isDC1X(b.pick))) return false;
    if ((isWinnerHome(a.pick) && isDCX2(b.pick)) || (isWinnerAway(a.pick) && isDC1X(b.pick))) return false;
    if (isDraw(a.pick) && (isDC12(b.pick) || isWinnerHome(b.pick) || isWinnerAway(b.pick))) return false;

    // Goal market contradictions
    if (isOver(a.pick) && isUnder(b.pick)) {
      // any over vs any under considered contradictory for simplicity
      return false;
    }
    if (isBTTSYes(a.pick) && isBTTSNo(b.pick)) return false;

    // Conservative: Under 2.5 tends to conflict with BTTS Yes; Over 2.5 tends to conflict with BTTS No.
    const ap = String(a.pick).toLowerCase();
    const bp = String(b.pick).toLowerCase();
    if ((ap.includes("under 2.5") || ap.includes("under 1.5")) && isBTTSYes(b.pick)) return false;
    if ((bp.includes("under 2.5") || bp.includes("under 1.5")) && isBTTSYes(a.pick)) return false;
    if ((ap.includes("over 2.5") || ap.includes("over 3.5")) && isBTTSNo(b.pick)) return false;
    if ((bp.includes("over 2.5") || bp.includes("over 3.5")) && isBTTSNo(a.pick)) return false;
  }
  return true;
}

// --- Parlay builder ---
function productOdds(legs){
  let prod = 1;
  for (const l of legs) {
    const o = safeNum(l.usedOdd);
    if (!o) return null;
    prod *= o;
  }
  return prod;
}

function scoreCandidate(c, target){
  // Higher targets weight odds more, lower targets weight prob more
  const t = Number(target);
  const wOdd = t >= 50 ? 1.15 : (t >= 20 ? 0.95 : (t >= 10 ? 0.75 : 0.55));
  const wProb = t >= 50 ? 0.45 : (t >= 20 ? 0.60 : (t >= 10 ? 0.80 : 1.0));
  const wEdge = t >= 50 ? 0.55 : 0.35;
  const logOdd = Math.log(Math.max(1.0001, c.usedOdd || 1));
  return (wOdd * logOdd) + (wProb * (c.prob || 0)) + (wEdge * (c.valueEdge || 0));
}

function buildParlayForTarget(allCandidatesFlat, target){
  const minProb = MIN_PROB_BY_TARGET[target] ?? 0.7;
  const minLegs = MIN_LEGS_BY_TARGET[target] ?? 4;
  const maxLegs = MAX_LEGS_BY_TARGET[target] ?? 10;

  const pool = allCandidatesFlat
    .filter(c => (c.prob ?? 0) >= minProb)
    .filter(c => (c.usedOdd ?? 0) >= 1.02);

  if (pool.length === 0) return { target, finalOdd: null, legs: [] };

  // Multi-attempt randomized greedy to avoid repeating same fixtures
  let best = null;

  const attempts = 60;
  for (let k=0; k<attempts; k++){
    // slight randomness in ordering
    const shuffled = pool.slice().sort((a,b) => (scoreCandidate(b,target)-scoreCandidate(a,target)) + (Math.random()-0.5)*0.35);

    const legs = [];
    const perFixtureCount = new Map();
    let prod = 1;

    const want = target * 0.95; // accept close
    for (const c of shuffled) {
      const fid = c.fixtureId;
      const used = perFixtureCount.get(fid) || 0;
      if (used >= 2) continue;

      // If already enough legs and prod already good, stop
      if (legs.length >= minLegs && prod >= want) break;
      if (legs.length >= maxLegs) break;

      // Check compatibility with existing legs
      let ok = true;
      for (const l of legs) {
        if (l.fixtureId === fid && !compatible(l, c)) { ok = false; break; }
      }
      if (!ok) continue;

      // Also avoid too many from same fixture early
      if (used === 1 && legs.length < (minLegs-1)) continue;

      // Heuristic: for high targets, prefer odds >= 1.3 sometimes
      if (target >= 50 && (c.usedOdd ?? 1) < 1.20 && legs.length < (minLegs+2)) continue;

      legs.push(c);
      perFixtureCount.set(fid, used+1);
      prod *= (c.usedOdd || 1);
    }

    // If still low, try to add remaining best odds regardless of prob (still >= minProb)
    if (legs.length < minLegs || prod < want) {
      for (const c of shuffled) {
        if (legs.length >= maxLegs) break;
        if (legs.includes(c)) continue;
        const fid = c.fixtureId;
        const used = perFixtureCount.get(fid) || 0;
        if (used >= 2) continue;
        let ok = true;
        for (const l of legs) {
          if (l.fixtureId === fid && !compatible(l, c)) { ok = false; break; }
        }
        if (!ok) continue;
        legs.push(c);
        perFixtureCount.set(fid, used+1);
        prod *= (c.usedOdd || 1);
        if (legs.length >= minLegs && prod >= want) break;
      }
    }

    // Evaluate attempt
    const avgProb = legs.length ? (legs.reduce((s,x)=>s+(x.prob||0),0)/legs.length) : 0;
    const over = prod >= want;
    const fit = over ? (-Math.abs(Math.log(prod/target))) : (-Math.abs(Math.log((prod+1e-9)/target)) - 0.15);
    const diversity = new Set(legs.map(l=>l.fixtureId)).size / Math.max(1, legs.length);
    const objective = fit + 0.65*avgProb + 0.25*diversity + 0.08*Math.log(Math.max(1.0, prod));

    if (!best || objective > best.objective) {
      best = { objective, prod, legs, avgProb };
    }
  }

  const finalOdd = best?.prod ? round2(best.prod) : null;
  return { target, finalOdd, legs: best?.legs || [] };
}

function flattenCandidates(candidatesByFixture){
  const flat = [];
  for (const arr of Object.values(candidatesByFixture || {})) {
    for (const c of (arr || [])) flat.push(c);
  }
  return flat;
}

// --- Public engine used by Comparator.jsx ---
export function buildFvOutput({
  fixtures=[],
  oddsByFixture={},
  statsByFixture={},
  rangeDays=1,
}){
  // Build broad pool once; targets apply their own minProb and weighting.
  const candidatesByFixture = buildCandidatePicks({
    fixtures,
    oddsByFixture,
    statsByFixture,
    minProb: 0.55,
  });

  const flat = flattenCandidates(candidatesByFixture);

  // SAFE (Cuota segura regalo): prioritize high prob. If missing stats, mark "Datos parciales".
  const safeCand = flat.slice()
    .filter(c => (c.prob ?? 0) >= 0.78)
    .sort((a,b)=> (b.prob??0)-(a.prob??0) || (b.valueEdge??0)-(a.valueEdge??0) || (a.usedOdd??0)-(b.usedOdd??0))[0] || null;

  const safe = safeCand ? ({
    fixtureId: safeCand.fixtureId,
    home: safeCand.home,
    away: safeCand.away,
    label: safeCand.pick,
    pick: safeCand.pick,
    prob: safeCand.prob,        // 0..1
    fvOdd: safeCand.fvOdd,
    marketOdd: safeCand.usedOdd,
    dataQuality: safeCand.partial ? "partial" : "full",
  }) : null;

  // VALUE list: positive edge with decent prob.
  const valueList = flat.slice()
    .filter(c => (c.valueEdge ?? -999) >= 0.05 && (c.prob ?? 0) >= 0.58)
    .sort((a,b)=> (b.valueEdge??0)-(a.valueEdge??0) || (b.prob??0)-(a.prob??0))
    .slice(0, 12)
    .map(v => ({
      fixtureId: v.fixtureId,
      home: v.home,
      away: v.away,
      label: v.pick,
      pick: v.pick,
      fvOdd: v.fvOdd,
      marketOdd: v.usedOdd,
      valueEdge: v.valueEdge,
      prob: v.prob,
      partial: v.partial,
    }));

  // Gift bundle / Cuotas potenciadas: a mid target around x5–x8
  const gb = buildParlayForTarget(flat, 5);
  const giftBundle = {
    finalOdd: gb.finalOdd,
    legs: (gb.legs || []).map(l => ({
      fixtureId: l.fixtureId,
      home: l.home,
      away: l.away,
      label: l.pick,
      pick: l.pick,
      usedOdd: l.usedOdd,
      usedOddDisplay: l.usedOdd,
      prob: l.prob,
      partial: l.partial,
    })),
  };

  // Parlays potentiados: x3/x5/x10/x20/x50/x100
  const parlays = TARGETS.map(t => {
    const p = buildParlayForTarget(flat, t);
    return {
      label: `Potenciada x${t}`,
      target: t,
      finalOdd: p.finalOdd,
      games: new Set((p.legs||[]).map(l=>l.fixtureId)).size,
      legs: (p.legs || []).map(l => ({
        fixtureId: l.fixtureId,
        home: l.home,
        away: l.away,
        label: l.pick,
        pick: l.pick,
        usedOdd: l.usedOdd,
        usedOddDisplay: l.usedOdd,
        prob: l.prob,
        partial: l.partial,
      })),
    };
  });

  // If nothing, return empty but consistent shape
  return {
    safe,
    giftBundle,
    parlays,
    valueList,
    candidatesByFixture,
    meta: {
      rangeDays,
      fixturesCount: (fixtures||[]).length,
      candidatesCount: flat.length,
      version: "aggressive-targetaware-v7-fixed",
    },
  };
}

// Export buildCandidatePicks for other modules / debugging
export { buildCandidatePicks };
