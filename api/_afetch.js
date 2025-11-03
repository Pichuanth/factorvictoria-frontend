// Serverless helper para API-Football
const BASE = "https://v3.football.api-sports.io";

export default async function afetch(path, params = {}) {
  const key = process.env.VITE_APIFOOTBALL_KEY;
  if (!key) throw new Error("Falta VITE_APIFOOTBALL_KEY en Vercel");

  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  const res = await fetch(url, {
    headers: {
      "x-apisports-key": key,
      "x-rapidapi-key": key
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}
