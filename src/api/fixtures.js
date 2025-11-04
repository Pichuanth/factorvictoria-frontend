// frontend/src/api/fixtures.js
import { apiGet } from "./client";

// Devuelve fixtures desde nuestro endpoint serverless
export async function getFixturesByDate(date, q = "") {
  const params = { date };
  // Puedes pasar country (texto) o league (número). Por ahora usamos 'country' si viene string.
  if (q) params.country = q;
  return apiGet("/fixtures", params);
}

// Mantener esta función porque la usa Comparator.jsx.
// Por ahora hace de wrapper y devuelve estructura mínima.
export async function getSmartPicks({ date, q = "", target = 100, days = 0 }) {
  const fixtures = await apiGet("/fixtures", { date, country: q, days });
  // placeholder: devolvemos los primeros 10 como "picks"
  return {
    picks: fixtures.slice(0, 10),
    meta: { count: fixtures.length, target, reached: fixtures.length >= 1 },
  };
}
