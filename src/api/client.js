// src/api/client.js
const BASE = "https://v3.football.api-sports.io";

function qs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return q.toString();
}

// Lectura de variables Vite
const API_KEY = import.meta.env.VITE_APIFOOTBALL_KEY || "";
const API_TZ  = import.meta.env.VITE_API_TZ || "UTC";

export async function apiGet(path, params = {}) {
  if (!API_KEY) {
    return { error: "Falta VITE_APIFOOTBALL_KEY" };
  }
  const url = `${BASE}${path}?${qs({ timezone: API_TZ, ...params })}`;

  const res = await fetch(url, {
    headers: {
      "x-apisports-key": API_KEY,
      accept: "application/json",
    },
  });

  // Si la API devolviera HTML/403, evitamos parseo roto
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Respuesta no JSON (${res.status})`, raw: text };
  }
}
