// src/api/client.js
const API_HOST = "https://v3.football.api-sports.io";
const KEY = import.meta.env.VITE_APIFOOTBALL_KEY || "";
const TZ  = import.meta.env.VITE_API_TZ || "UTC";

// Construye querystring
function qs(params = {}) {
  const u = new URLSearchParams(params);
  return u.toString();
}

// Lee como texto y si se puede, parsea JSON.
// Si el servidor devuelve HTML o texto de error, no revienta el UI.
async function safeJson(res) {
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    const snippet = text.slice(0, 120);
    const err = new Error(`Respuesta no-JSON de API: "${snippet}"`);
    err.raw = text;
    throw err;
  }
  return data;
}

export async function apiGet(path, params = {}) {
  // Si no hay KEY devolvemos un error “amigable” sin romper.
  if (!KEY) {
    throw new Error("Falta VITE_APIFOOTBALL_KEY. Configura tu .env y variables en Vercel.");
  }

  const url = `${API_HOST}${path}?${qs({ timezone: TZ, ...params })}`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "x-apisports-key": KEY,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    const msg = body.slice(0, 160);
    throw new Error(`HTTP ${res.status}. ${msg}`);
  }
  return safeJson(res);
}
