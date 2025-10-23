// src/api/fixtures.js
import { apiGet } from "./client";

// date en formato YYYY-MM-DD
export async function getFixturesByDate(date, q = "") {
  const params = { date };
  // Si el usuario escribió algo, lo usamos como “search term” básico:
  // API-Football no tiene un único “search”, pero podemos priorizar liga/país.
  // Mantengo simple: si q es numérico lo intento como id de liga; si no, lo ignoro.
  if (/^\d+$/.test(q.trim())) params.league = q.trim();

  const json = await apiGet("/fixtures", params);
  return Array.isArray(json?.response) ? json.response : [];
}
