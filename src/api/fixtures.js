// src/api/fixtures.js
import { apiGet } from "./client";

// date: "YYYY-MM-DD"; q opcional: si es número se usa como id de liga
export async function getFixturesByDate(date, q = "") {
  const params = { date };
  if (q && /^\d+$/.test(q.trim())) params.league = q.trim();

  const json = await apiGet("/fixtures", params);
  return Array.isArray(json?.response) ? json.response : [];
}
