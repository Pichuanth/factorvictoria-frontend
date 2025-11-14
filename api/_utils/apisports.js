// api/_utils/apisports.js
export const APIS_KEY = process.env.APISPORTS_KEY;
export const APIS_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";

function baseHeaders() {
  return {
    "x-apisports-key": APIS_KEY,
    "x-rapidapi-key": APIS_KEY,       // por compatibilidad si tu plan usa RapidAPI
    "x-rapidapi-host": APIS_HOST,     // idem
  };
}

// Wrapper simple de fetch para APISports
export async function apisGet(path, params = {}) {
  if (!APIS_KEY) {
    throw new Error("Falta APISPORTS_KEY en variables de entorno");
  }
  const usp = new URLSearchParams(params);
  const url = `https://${APIS_HOST}${path}?${usp.toString()}`;
  const res = await fetch(url, { headers: baseHeaders(), cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`APISports ${res.status}: ${txt || res.statusText}`);
  }
  const json = await res.json();
  return json;
}
