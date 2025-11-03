import { apiGet } from "./client";
export async function getOddsByFixture(fixtureId) {
  return apiGet("/odds", { fixture: fixtureId }); // {home,draw,away,bookmaker}
}
