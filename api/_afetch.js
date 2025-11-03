// frontend/api/_afetch.js
import fetch from "node-fetch";

const API_BASE = "https://v3.football.api-sports.io";

const API_KEY =
  process.env.VITE_APIFOOTBALL_KEY ||
  process.env.APIFOOTBALL_KEY || // alias por si cambias el nombre
  "";

if (!API_KEY) {
  console.warn("[_afetch] Falta VITE_APIFOOTBALL_KEY en Vercel");
}

export async function afetch(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) {
      url.searchParams.set(k, String(v));
    }
  });

  const res = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-key": API_KEY,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} ${res.status} - ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json;
}
