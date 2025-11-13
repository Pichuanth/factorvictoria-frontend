// api/_apifootball.js
const BASE = "https://v3.football.api-sports.io";

export async function afetch(path, init = {}) {
  const key = process.env.APISPORTS_KEY;
  const host = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
  if (!key) {
    return { ok: false, status: 500, json: async () => ({ error: "Missing APISPORTS_KEY" }) };
  }
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "x-rapidapi-key": key,
      "x-rapidapi-host": host,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  return res;
}

// Utilidad: formatea respuesta estándar del wrapper
export async function jsonOrError(res) {
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}
