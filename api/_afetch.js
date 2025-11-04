// Serverless helper para API-FOOTBALL
const API_BASE = "https://v3.football.api-sports.io";

export async function aFetch(endpoint, search = {}) {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) {
    throw new Error("Falta APIFOOTBALL_KEY en variables de entorno");
  }
  const qs = new URLSearchParams(search);
  const url = `${API_BASE}${endpoint}?${qs.toString()}`;

  const res = await fetch(url, {
    headers: {
      "x-apisports-key": key,
      // El host ya no es obligatorio, pero no hace daño:
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.response ?? [];
}
