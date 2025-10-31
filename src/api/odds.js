// frontend/src/api/odds.js
import { apiGet } from "./client";

// Pide al backend (/api/odds en Vercel) las cuotas del fixture
export async function getOddsByFixture(fixtureId) {
  const json = await apiGet("/odds", { fixture: fixtureId });
  // json debería ser { home, draw, away, bookmaker }
  return json || {};
}
