// frontend/src/api/odds.js  (frontend)
import { apiGet } from "./client";

export async function getOddsByFixture(fixtureId) {
  // devuelve { home, draw, away, bookmaker }
  return await apiGet("/odds", { fixture: fixtureId });
}
