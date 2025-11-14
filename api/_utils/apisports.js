// frontend/api/_utils/apisports.js
export function apiSportsHeaders() {
  const key = process.env.APISPORTS_KEY;
  const host = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
  if (!key) throw new Error("APISPORTS_KEY no definido");
  return {
    "x-apisports-key": key,
    "x-rapidapi-key": key,   // por compatibilidad
    "x-rapidapi-host": host, // por compatibilidad
  };
}

export function apiSportsBase() {
  const host = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
  return `https://${host}`;
}

// util: YYYY-MM-DD inclusive list
export function listDays(from, to) {
  const out = [];
  let d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export const COUNTRY_ALIAS = {
  francia: "France",
  inglaterra: "England",
  españa: "Spain",
  espana: "Spain",
  portugal: "Portugal",
  italia: "Italy",
  alemania: "Germany",
  noruega: "Norway",
  chile: "Chile",
  argentina: "Argentina",
  brasil: "Brazil",
  mexico: "Mexico",
  eeuu: "USA",
  estadosunidos: "USA",
};
export const norm = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, "");
export const mapCountry = (q) => COUNTRY_ALIAS[norm(q)] || null;
