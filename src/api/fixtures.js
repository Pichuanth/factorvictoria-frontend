// frontend/src/api/fixtures.js  (frontend)
import { apiGet } from "./client";

// date: "YYYY-MM-DD", q puede ser "" | número (liga) | texto (país)
export async function getFixturesByDate(date, q = "") {
  const params = { date };
  const t = String(q).trim();

  if (t) {
    if (/^\d+$/.test(t)) params.league = t;   // Si es numérico, lo tratamos como id de liga
    else params.country = t;                  // Si no, como nombre de país (ej: "Chile")
  }

  const json = await apiGet("/fixtures", params);
  return Array.isArray(json) ? json : [];
}
