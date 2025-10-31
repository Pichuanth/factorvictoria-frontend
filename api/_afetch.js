// frontend/api/_afetch.js
const fetch = require("node-fetch");

module.exports = async function afetch(path, params = {}) {
  const API_KEY = process.env.VITE_APIFOOTBALL_KEY;
  const TZ = process.env.VITE_API_TZ || "America/Santiago";

  if (!API_KEY) {
    throw new Error("Falta VITE_APIFOOTBALL_KEY en variables de entorno");
  }

  // Armamos querystring
  const usp = new URLSearchParams({ ...params });
  if (!usp.has("timezone")) {
    usp.set("timezone", TZ);
  }

  const url = `https://v3.football.api-sports.io${path}?${usp.toString()}`;

  const resp = await fetch(url, {
    headers: {
      "x-apisports-key": API_KEY,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API-Football error ${resp.status}: ${text}`);
  }

  const json = await resp.json();
  return json;
};
