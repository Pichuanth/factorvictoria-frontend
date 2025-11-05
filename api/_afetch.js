export const config = { runtime: "nodejs" };

const BASE = "https://v3.football.api-sports.io";
const HEADERS = () => {
  const key = process.env.APIFOOTBALL_KEY;
  return {
    "x-apisports-key": key || "",
    "x-rapidapi-host": "v3.football.api-sports.io",
    accept: "application/json",
  };
};

export default async function aFetch(path, searchParams = {}) {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) {
    throw new Error("Missing APIFOOTBALL_KEY");
  }
  const sp = new URLSearchParams(searchParams);
  const url = `${BASE}${path}?${sp.toString()}`;
  const res = await fetch(url, { headers: HEADERS() });

  const text = await res.text(); // por si la API devuelve HTML/errores
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    const msg = typeof data === "object" ? JSON.stringify(data) : String(data);
    throw new Error(`APIFootball ${res.status}: ${msg}`);
  }
  return data;
}
