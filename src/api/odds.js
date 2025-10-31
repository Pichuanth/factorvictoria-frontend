// frontend/src/api/odds.js
import { apiGet } from "./client";

// Pide al backend (nuestra ruta /api/odds) las cuotas del fixture
// Recibe fixtureId (número)
export async function getOddsByFixture(fixtureId) {
  const json = await apiGet("/odds", { fixture: fixtureId });
  // En teoría json ya es el objeto { home, draw, away, bookmaker }
  return json || {};
}
