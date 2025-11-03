import { apiGet } from "./client";
export async function getFixturesByDate(date, q = "") {
  const params = { date };
  if (q) params.country = q;           // o league id si pasas número
  return apiGet("/fixtures", params);  // devuelve array de fixtures ya del backend
}
