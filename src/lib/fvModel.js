export function buildCandidatePicks({ fixture, pack, markets }) {
  // 1) lambdas (si no hay modelo, usa fallback)
  const { lambdaHome, lambdaAway, lambdaTotal } = estimateLambdasFromPack(pack);

  // 2) forma + h2h (heurística)
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

  // 3) probs base
  const dc = probsDoubleChance(lambdaHome, lambdaAway);

  const under35_h = probUnderFromAvgGoals(usableTotal, 3.5);
  const under25_h = probUnderFromAvgGoals(usableTotal, 2.5);

  const under35 = under35_h ?? probUnderLine(lambdaTotal, 3.5);
  const under25 = under25_h ?? probUnderLine(lambdaTotal, 2.5);

  const over25 = clamp(1 - under25, 0.01, 0.99);

  const bttsNo_h = probBTTSNoFromBttsRate(h2h?.bttsRate);
  const bttsNo = bttsNo_h ?? probBTTSNo(lambdaHome, lambdaAway);

  // 4) output candidates
  const out = [];

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

  // 5) clean + enrich
  const cleaned = out
    .filter((x) => Number.isFinite(x.prob) && x.prob > 0.01 && x.prob < 0.999)
    .map((x) => {
      const bestOdd = Number.isFinite(Number(x.marketOdd)) ? Number(x.marketOdd) : Number(x.fvOdd);
      const valueEdge = Number.isFinite(Number(x.marketOdd)) ? (Number(x.marketOdd) / Number(x.fvOdd)) - 1 : null;

      return {
        ...x,
        fvOdd: round2(x.fvOdd),
        marketOdd: x.marketOdd ? round2(x.marketOdd) : null,
        usedOdd: round2(bestOdd),
        valueEdge: valueEdge === null ? null : round2(valueEdge),
        fixtureId: Number(fixture?.fixture?.id || fixture?.id || pack?.fixtureId),
        home: fixture?.teams?.home?.name || pack?.teams?.home?.name || "Home",
        away: fixture?.teams?.away?.name || pack?.teams?.away?.name || "Away",
      };
    });

  cleaned.sort((a, b) => (b.prob - a.prob) || (a.usedOdd - b.usedOdd));
  return cleaned;
}
