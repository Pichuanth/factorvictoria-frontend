// frontend/api/_oddsCore.js
import { afetch } from "./_afetch.js";

// Devuelve mercados básicos para un fixture
export async function getOddsForFixture(fixtureId) {
  const js = await afetch("/odds", { fixture: fixtureId });
  const r = js?.response?.[0];
  const out = {};
  const books = r?.bookmakers || [];

  for (const b of books) {
    for (const bet of (b.bets || [])) {
      const name = (bet.name || "").toLowerCase();

      // 1X2 (Match Winner)
      if (/match winner|1x2/.test(name)) {
        for (const v of bet.values || []) {
          const label = (v.value || "").toLowerCase();
          const odd = Number(v.odd);
          if (!odd) continue;
          if (/home|^1$/.test(label)) out.home = odd;
          else if (/draw|^x$/.test(label)) out.draw = odd;
          else if (/away|^2$/.test(label)) out.away = odd;
        }
      }

      // Double Chance
      else if (/double chance/.test(name)) {
        for (const v of bet.values || []) {
          const label = (v.value || "").toLowerCase();
          const odd = Number(v.odd);
          if (!odd) continue;
          if (/1x/.test(label)) out.dc1x = odd;
          if (/12/.test(label)) out.dc12 = odd;
          if (/x2/.test(label)) out.dcx2 = odd;
        }
      }

      // Over/Under Goals
      else if (/over\/under|goals over\/under/.test(name)) {
        for (const v of bet.values || []) {
          const label = (v.value || "").toLowerCase();
          const odd = Number(v.odd);
          if (!odd) continue;
          if (/over 1\.5/.test(label)) out.over15 = odd;
          if (/over 2\.5/.test(label)) out.over25 = odd;
        }
      }
    }
    // con un primer book que traiga algo nos basta
    if (out.home || out.dc1x || out.over15) break;
  }
  return { markets: out };
}
