// FV_MODEL_VERSION: 2026-02-17-aggressive-v7
// Motor de picks + armado de parlays para Factor Victoria.
// Objetivos:
// - Llegar a targets altos (x50/x100) cuando el pool lo permite.
// - Diversificar (no repetir siempre 2 partidos).
// - Permitir hasta 2 legs por fixture (NO contradictorios).
// - Ser más agresivo solo cuando el target lo requiere.
// - Robusto a datos incompletos (odds/stats), sin romper build.

// -------------------- utils --------------------
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function odd(n) {
  const x = toNum(n);
  return x != null && x > 1.0001 ? x : null;
}

function round2(n) {
  const x = toNum(n);
  return x == null ? null : Math.round(x * 100) / 100;
}

function safeStr(s) {
  return String(s || "").trim();
}

function getFixtureId(fx) {
  return fx?.fixture?.id ?? fx?.id ?? fx?.fixture_id ?? fx?.fixtureId ?? null;
}

function getTeams(fx) {
  const home = fx?.teams?.home?.name ?? fx?.home?.name ?? fx?.homeTeam?.name ?? fx?.team_home ?? "";
  const away = fx?.teams?.away?.name ?? fx?.away?.name ?? fx?.awayTeam?.name ?? fx?.team_away ?? "";
  return { home: safeStr(home) || "—", away: safeStr(away) || "—" };
}

// markets shape from cache: markets[marketKey] = oddNumber | {odd, value, price}
function readMarketOdd(markets, key) {
  if (!markets || !key) return null;
  const v = markets[key];
  if (v == null) return null;
  if (typeof v === "number") return odd(v);
  if (typeof v === "string") return odd(v);
  if (typeof v === "object") {
    return odd(v.odd ?? v.value ?? v.price ?? v.odds);
  }
  return null;
}

// pack shape: pack.probs?.[key] or pack.model?.[key] etc. We try a few.
function readPackProb(pack, key) {
  if (!pack || !key) return null;
  const direct = pack?.probs?.[key] ?? pack?.prob?.[key] ?? pack?.p?.[key];
  const n1 = toNum(direct);
  if (n1 != null) return clamp(n1, 0.01, 0.99);
  const model = pack?.model ?? pack?.pred ?? pack?.preds ?? null;
  const n2 = toNum(model?.[key]);
  if (n2 != null) return clamp(n2, 0.01, 0.99);
  return null;
}

function impliedProbFromOdd(o) {
  const x = odd(o);
  if (!x) return null;
  // simple margin guard
  return clamp(1 / x, 0.02, 0.98);
}

function fairOddFromProb(p) {
  const pp = toNum(p);
  if (pp == null || pp <= 0) return null;
  return 1 / clamp(pp, 0.02, 0.98);
}

function valueEdge(prob, usedOdd) {
  const p = toNum(prob);
  const o = odd(usedOdd);
  if (p == null || !o) return null;
  // EV-1
  return p * o - 1;
}

// -------------------- market catalogue --------------------
// We keep keys consistent with what your backend/odds cache uses. If a key doesn't exist, it's skipped.
// IMPORTANT: the string label is what the UI shows.
const MARKET_CATALOG = [
  // Double chance
  { key: "dc_1x", label: "Doble oportunidad 1X", type: "DC", side: "1X" },
  { key: "dc_x2", label: "Doble oportunidad X2", type: "DC", side: "X2" },
  { key: "dc_12", label: "Doble oportunidad 12", type: "DC", side: "12" },

  // Moneyline
  { key: "ml_home", label: "Gana local", type: "ML", side: "H" },
  { key: "ml_away", label: "Gana visita", type: "ML", side: "A" },
  { key: "ml_draw", label: "Empate", type: "ML", side: "D" },

  // DNB
  { key: "dnb_home", label: "DNB local", type: "DNB", side: "H" },
  { key: "dnb_away", label: "DNB visita", type: "DNB", side: "A" },

  // Totals
  { key: "ou_over_15", label: "Over 1.5 goles", type: "OU", side: "O", line: 1.5 },
  { key: "ou_over_25", label: "Over 2.5 goles", type: "OU", side: "O", line: 2.5 },
  { key: "ou_over_35", label: "Over 3.5 goles", type: "OU", side: "O", line: 3.5 },
  { key: "ou_under_35", label: "Under 3.5 goles", type: "OU", side: "U", line: 3.5 },
  { key: "ou_under_25", label: "Under 2.5 goles", type: "OU", side: "U", line: 2.5 },

  // BTTS
  { key: "btts_yes", label: "Ambos marcan: Sí", type: "BTTS", side: "Y" },
  { key: "btts_no", label: "Ambos marcan: NO", type: "BTTS", side: "N" },
];

// if your odds cache uses different names, add aliases here:
const MARKET_ALIASES = {
  // examples:
  // "dc_1x": ["double_chance_1x"],
};

function allKeysFor(catKey) {
  const arr = [catKey];
  const al = MARKET_ALIASES[catKey];
  if (Array.isArray(al)) arr.push(...al);
  return arr;
}

function getMarketOddWithAliases(markets, catKey) {
  const keys = allKeysFor(catKey);
  for (const k of keys) {
    const o = readMarketOdd(markets, k);
    if (o) return { keyUsed: k, odd: o };
  }
  return { keyUsed: null, odd: null };
}

function getProbWithAliases(pack, catKey) {
  const keys = allKeysFor(catKey);
  for (const k of keys) {
    const p = readPackProb(pack, k);
    if (p != null) return { keyUsed: k, prob: p };
  }
  return { keyUsed: null, prob: null };
}

// -------------------- contradictions & limits --------------------
function isContradiction(a, b) {
  if (!a || !b) return false;
  if (a.fixtureId !== b.fixtureId) return false;

  // Moneyline contradictions
  if (a.type === "ML" && b.type === "ML") {
    return a.side !== b.side;
  }

  // DC vs ML
  if (a.type === "DC" && b.type === "ML") {
    if (a.side === "1X" && b.side === "A") return true;
    if (a.side === "X2" && b.side === "H") return true;
    if (a.side === "12" && b.side === "D") return true;
  }
  if (a.type === "ML" && b.type === "DC") return isContradiction(b, a);

  // Totals contradictions (same line)
  if (a.type === "OU" && b.type === "OU") {
    if (a.line === b.line && a.side !== b.side) return true;
    // also: over 3.5 contradicts under 2.5 etc (strict)
    if (a.side === "O" && b.side === "U" && a.line >= b.line) return true;
    if (a.side === "U" && b.side === "O" && b.line >= a.line) return true;
  }

  // BTTS yes/no
  if (a.type === "BTTS" && b.type === "BTTS" && a.side !== b.side) return true;

  // conservative: BTTS yes with under 2.5 often conflicts; BTTS no with over 2.5 conflicts.
  if (a.type === "BTTS" && b.type === "OU") {
    if (a.side === "Y" && b.side === "U" && b.line <= 2.5) return true;
    if (a.side === "N" && b.side === "O" && b.line >= 2.5) return true;
  }
  if (a.type === "OU" && b.type === "BTTS") return isContradiction(b, a);

  return false;
}

// -------------------- candidate building --------------------
export function buildCandidatePicks({ fixture, pack, markets }) {
  const fixtureId = getFixtureId(fixture);
  if (!fixtureId) return [];
  const { home, away } = getTeams(fixture);

  const out = [];

  for (const m of MARKET_CATALOG) {
    const { odd: marketOdd, keyUsed: marketKeyUsed } = getMarketOddWithAliases(markets, m.key);

    // probability: prefer model prob, else implied from odd (conservative)
    const { prob: pModel } = getProbWithAliases(pack, m.key);
    const p = pModel != null ? pModel : impliedProbFromOdd(marketOdd);
    if (p == null) continue;

    const fvOdd = fairOddFromProb(p);
    const usedOdd = marketOdd ?? fvOdd;

    const edge = valueEdge(p, usedOdd);

    // Basic sanity filters: avoid insane odds and absurd probabilities
    const usedOddOk = odd(usedOdd);
    if (!usedOddOk) continue;
    if (usedOddOk > 25) continue;

    out.push({
      fixtureId: String(fixtureId),
      home,
      away,
      pick: m.label,
      label: m.label,
      type: m.type,
      side: m.side,
      line: m.line ?? null,
      marketKey: marketKeyUsed ?? m.key,
      prob: round2(p),
      fvOdd: round2(fvOdd),
      marketOdd: round2(marketOdd),
      usedOdd: round2(usedOddOk),
      usedOddDisplay: round2(usedOddOk),
      valueEdge: edge == null ? null : round2(edge),
    });
  }

  // rank inside fixture: by prob then by valueEdge then by usedOdd (slight)
  out.sort((a, b) => {
    const pa = toNum(a.prob) ?? 0;
    const pb = toNum(b.prob) ?? 0;
    if (pb !== pa) return pb - pa;
    const ea = toNum(a.valueEdge) ?? -9;
    const eb = toNum(b.valueEdge) ?? -9;
    if (eb !== ea) return eb - ea;
    return (odd(b.usedOdd) ?? 0) - (odd(a.usedOdd) ?? 0);
  });

  return out;
}

// pick with highest prob among fixtures (gift)
export function pickSafe(candidatesByFixture) {
  let best = null;
  for (const [fid, arr] of Object.entries(candidatesByFixture || {})) {
    for (const c of arr || []) {
      if (!c) continue;
      const p = toNum(c.prob);
      if (p == null) continue;
      // prioritize full-data candidates if Comparator attaches dataQuality
      const q = c.dataQuality === "full" ? 1 : 0;
      const bestQ = best?.dataQuality === "full" ? 1 : 0;
      if (!best || q > bestQ || (q === bestQ && p > (toNum(best.prob) ?? 0))) {
        best = { ...c, fixtureId: String(c.fixtureId ?? fid) };
      }
    }
  }
  return best;
}

// bundle for "cuotas potenciadas" (single combo list)
export function buildGiftPickBundle(candidatesByFixture, minOdd = 1.2, maxOdd = 2.3, maxPicks = 5) {
  const pool = [];
  for (const [fid, arr] of Object.entries(candidatesByFixture || {})) {
    for (const c of arr || []) {
      const o = odd(c.usedOddDisplay ?? c.usedOdd);
      const p = toNum(c.prob);
      if (!o || p == null) continue;
      if (o < minOdd || o > maxOdd) continue;
      pool.push({ ...c, fixtureId: String(c.fixtureId ?? fid) });
    }
  }

  // prefer probability but keep some odd
  pool.sort((a, b) => {
    const qa = a.dataQuality === "full" ? 1 : 0;
    const qb = b.dataQuality === "full" ? 1 : 0;
    if (qb !== qa) return qb - qa;
    const sa = (toNum(a.prob) ?? 0) + 0.06 * Math.log(odd(a.usedOddDisplay ?? a.usedOdd) ?? 1);
    const sb = (toNum(b.prob) ?? 0) + 0.06 * Math.log(odd(b.usedOddDisplay ?? b.usedOdd) ?? 1);
    return sb - sa;
  });

  // one per fixture
  const used = new Set();
  const out = [];
  for (const c of pool) {
    if (out.length >= maxPicks) break;
    const fid = String(c.fixtureId);
    if (used.has(fid)) continue;
    used.add(fid);
    out.push(c);
  }
  return out;
}

// value list for "desfase del mercado"
export function buildValueList(candidatesByFixture, minEdge = 0.06) {
  const rows = [];
  for (const [fid, arr] of Object.entries(candidatesByFixture || {})) {
    for (const c of arr || []) {
      const edge = toNum(c.valueEdge);
      const p = toNum(c.prob);
      const o = odd(c.usedOddDisplay ?? c.usedOdd);
      if (edge == null || p == null || !o) continue;
      if (edge < minEdge) continue;
      rows.push({ ...c, fixtureId: String(c.fixtureId ?? fid) });
    }
  }
  rows.sort((a, b) => (toNum(b.valueEdge) ?? 0) - (toNum(a.valueEdge) ?? 0));
  return rows.slice(0, 12);
}

// -------------------- parlay builder --------------------
function targetConfig(target) {
  const t = Number(target);
  // dynamic minProb & leg limits
  // We intentionally relax for high targets.
  const cfg = {
    target: t,
    minProb: 0.75,
    minLegs: 2,
    maxLegs: 6,
    allowTwoPerFixture: false,
    hardMinOdd: 1.12,
    hardMaxOdd: 6.5,
  };

  if (t <= 3) {
    cfg.minProb = 0.78;
    cfg.minLegs = 2;
    cfg.maxLegs = 3;
  } else if (t <= 5) {
    cfg.minProb = 0.74;
    cfg.minLegs = 3;
    cfg.maxLegs = 5;
  } else if (t <= 10) {
    cfg.minProb = 0.70;
    cfg.minLegs = 4;
    cfg.maxLegs = 7;
  } else if (t <= 20) {
    cfg.minProb = 0.66;
    cfg.minLegs = 5;
    cfg.maxLegs = 9;
    cfg.allowTwoPerFixture = true;
  } else if (t <= 50) {
    cfg.minProb = 0.60;
    cfg.minLegs = 8;
    cfg.maxLegs = 12;
    cfg.allowTwoPerFixture = true;
    cfg.hardMaxOdd = 9.0;
  } else {
    cfg.minProb = 0.55;
    cfg.minLegs = 10;
    cfg.maxLegs = 14;
    cfg.allowTwoPerFixture = true;
    cfg.hardMaxOdd = 12.0;
  }

  return cfg;
}

function pickScoreForTarget(c, cfg) {
  const p = toNum(c.prob) ?? 0.5;
  const o = odd(c.usedOddDisplay ?? c.usedOdd) ?? 1.2;
  const edge = toNum(c.valueEdge);

  // Encourage slightly higher odds for higher targets, but still anchored on probability.
  const targetBoost = cfg.target >= 20 ? 0.22 : cfg.target >= 10 ? 0.14 : 0.08;
  const oddBoost = targetBoost * Math.log(o);

  // Edge helps but shouldn't dominate.
  const edgeBoost = edge != null ? clamp(edge, -0.2, 0.6) * 0.35 : 0;

  // Type weights: for high targets, allow BTTS/Over2.5 more.
  const lbl = String(c.label || c.pick || "").toLowerCase();
  let typeW = 1.0;
  if (cfg.target >= 20) {
    if (lbl.includes("over 2.5")) typeW = 1.08;
    if (lbl.includes("ambos") && (lbl.includes("sí") || lbl.includes("si"))) typeW = 1.06;
    if (lbl.includes("gana")) typeW = 1.04;
  } else {
    // more conservative
    if (lbl.includes("over 3.5")) typeW = 0.82;
    if (lbl.includes("empate")) typeW = 0.78;
  }

  return (p * 1.0 + oddBoost + edgeBoost) * typeW;
}

function computeFinalOdd(legs) {
  let prod = 1;
  for (const l of legs) {
    const o = odd(l.usedOddDisplay ?? l.usedOdd);
    if (!o) return null;
    prod *= o;
  }
  return prod;
}

export function buildParlay({ candidatesByFixture, target, cap = 12 }) {
  const cfg = targetConfig(target);

  // Flatten pool
  const pool = [];
  for (const [fid, arr] of Object.entries(candidatesByFixture || {})) {
    for (const c of arr || []) {
      const p = toNum(c.prob);
      const o = odd(c.usedOddDisplay ?? c.usedOdd);
      if (p == null || !o) continue;
      if (o < cfg.hardMinOdd || o > cfg.hardMaxOdd) continue;
      // IMPORTANT: minProb is dynamic, but we also allow a small "escape hatch" for very high odds
      const minP = cfg.minProb;
      const allowIfHighOdd = cfg.target >= 50 && o >= 1.75 && p >= (minP - 0.06);
      if (p < minP && !allowIfHighOdd) continue;

      pool.push({
        ...c,
        fixtureId: String(c.fixtureId ?? fid),
        __score: pickScoreForTarget(c, cfg),
      });
    }
  }

  // If pool is too small, relax a bit (only for high targets)
  if (pool.length < cfg.minLegs && cfg.target >= 20) {
    const relaxedMin = cfg.minProb - 0.05;
    for (const [fid, arr] of Object.entries(candidatesByFixture || {})) {
      for (const c of arr || []) {
        if (pool.length >= cfg.maxLegs * 4) break;
        const p = toNum(c.prob);
        const o = odd(c.usedOddDisplay ?? c.usedOdd);
        if (p == null || !o) continue;
        if (o < cfg.hardMinOdd || o > cfg.hardMaxOdd) continue;
        if (p < relaxedMin) continue;
        pool.push({
          ...c,
          fixtureId: String(c.fixtureId ?? fid),
          __score: pickScoreForTarget(c, cfg) * 0.92,
        });
      }
    }
  }

  // Sort by score
  pool.sort((a, b) => (b.__score || 0) - (a.__score || 0));

  // Greedy build: diversify fixtures first, then allow 2nd pick per fixture if cfg allows.
  const legs = [];
  const fixtureCount = new Map();

  const maxLegs = Math.min(cfg.maxLegs, cap || cfg.maxLegs);

  function canUse(c) {
    const fid = String(c.fixtureId);
    const usedN = fixtureCount.get(fid) || 0;
    if (usedN >= 1 && !cfg.allowTwoPerFixture) return false;
    if (usedN >= 2) return false;
    // no contradictions within same fixture
    for (const l of legs) {
      if (isContradiction(l, c)) return false;
    }
    return true;
  }

  // Phase 1: one pick per fixture
  for (const c of pool) {
    if (legs.length >= maxLegs) break;
    const fid = String(c.fixtureId);
    if ((fixtureCount.get(fid) || 0) >= 1) continue;
    if (!canUse(c)) continue;
    legs.push(stripInternal(c));
    fixtureCount.set(fid, 1);
    if (legs.length >= cfg.minLegs) {
      const fo = computeFinalOdd(legs);
      if (fo != null && fo >= cfg.target * 0.98) break;
    }
  }

  // Phase 2: add second legs to reach target (only if needed)
  if (cfg.allowTwoPerFixture && legs.length < maxLegs) {
    for (const c of pool) {
      if (legs.length >= maxLegs) break;
      if (!canUse(c)) continue;
      // only consider second-leg if it meaningfully increases odds
      const o = odd(c.usedOddDisplay ?? c.usedOdd) ?? 1.0;
      if (o < 1.18) continue;
      legs.push(stripInternal(c));
      const fid = String(c.fixtureId);
      fixtureCount.set(fid, (fixtureCount.get(fid) || 0) + 1);

      if (legs.length >= cfg.minLegs) {
        const fo = computeFinalOdd(legs);
        if (fo != null && fo >= cfg.target * 0.98) break;
      }
    }
  }

  // Ensure minimum legs: if still short, top-up without contradiction.
  if (legs.length < cfg.minLegs) {
    for (const c of pool) {
      if (legs.length >= cfg.minLegs) break;
      if (!canUse(c)) continue;
      legs.push(stripInternal(c));
      const fid = String(c.fixtureId);
      fixtureCount.set(fid, (fixtureCount.get(fid) || 0) + 1);
    }
  }

  // Final odd
  const finalOdd = computeFinalOdd(legs);

  return {
    target: cfg.target,
    finalOdd: finalOdd == null ? null : round2(finalOdd),
    legs,
  };
}

function stripInternal(c) {
  return {
    fixtureId: String(c.fixtureId),
    home: safeStr(c.home) || "—",
    away: safeStr(c.away) || "—",
    label: c.label || c.pick,
    pick: c.pick || c.label,
    type: c.type,
    side: c.side,
    line: c.line ?? null,
    prob: toNum(c.prob) ?? null,
    fvOdd: odd(c.fvOdd) ?? null,
    marketOdd: odd(c.marketOdd) ?? null,
    usedOdd: odd(c.usedOdd) ?? odd(c.usedOddDisplay) ?? null,
    usedOddDisplay: odd(c.usedOddDisplay) ?? odd(c.usedOdd) ?? null,
    valueEdge: toNum(c.valueEdge) ?? null,
    dataQuality: c.dataQuality || null,
  };
}

// For completeness if needed elsewhere
export const __internal = {
  fairOddFromProb,
};
