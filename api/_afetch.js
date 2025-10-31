// frontend/api/_afetch.js
const BASE_URL = "https://v3.football.api-sports.io";

// usamos las env que definiste en Vercel (.env local y Vercel env)
// OJO: en Vercel, process.env.VITE_APIFOOTBALL_KEY y process.env.VITE_API_TZ
const API_KEY = process.env.VITE_APIFOOTBALL_KEY;
const API_TZ = process.env.VITE_API_TZ || "America/Santiago";

module.exports = async function afetch(path, params = {}) {
  if (!API_KEY) {
    throw new Error("Falta VITE_APIFOOTBALL_KEY en las env vars");
  }

  // armar querystring ?a=b&c=d
  const qs = new URLSearchParams({
    timezone: API_TZ,
    ...params,
  });

  const url = `${BASE_URL}${path}?${qs.toString()}`;

  const resp = await fetch(url, {
    headers: {
      "x-rapidapi-key": API_KEY,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
  });

  // API-Football responde JSON
  const data = await resp.json();
  return data;
};
