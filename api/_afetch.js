// frontend/api/_afetch.js
const API_BASE = "https://v3.football.api-sports.io";

// En serverless leemos de process.env (puedes dejar el nombre con VITE_ sin problema)
const KEY = process.env.VITE_APIFOOTBALL_KEY || process.env.APIFOOTBALL_KEY || "";
const TZ  = process.env.VITE_API_TZ || "America/Santiago";

function buildQS(params = {}) {
  const q = new URLSearchParams(params);
  return q.toString() ? `?${q.toString()}` : "";
}

export async function afetch(path, params = {}) {
  if (!KEY) {
    throw new Error("Falta VITE_APIFOOTBALL_KEY en variables de entorno");
  }
  // agrega timezone por defecto si aplica
  const merged = { timezone: TZ, ...params };
  const url = `${API_BASE}${path}${buildQS(merged)}`;

  const resp = await fetch(url, {
    headers: {
      "x-apisports-key": KEY,
      "x-rapidapi-key": KEY        // por compatibilidad, algunos ejemplos la usan
    }
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`API-Football ${resp.status} ${resp.statusText} :: ${txt}`);
  }
  return resp.json();
}
