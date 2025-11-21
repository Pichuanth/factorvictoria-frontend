// api/fixtures.js
// Serverless function para Vercel (Node.js)

const APISPORTS_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const APISPORTS_KEY = process.env.APISPORTS_KEY || "";

// Pequeño helper para responder JSON
function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  try {
    const { method, query } = req;

    if (method !== "GET") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (!APISPORTS_KEY) {
      console.error("[/api/fixtures] Falta APISPORTS_KEY en variables de entorno");
      return sendJson(res, 200, { items: [] });
    }

    // Soportar date=YYYY-MM-DD o from/to
    const { date, from, to, country, league, status } = query;

    const params = new URLSearchParams();
    params.set("timezone", "America/Santiago");

    if (from && to) {
      params.set("from", String(from));
      params.set("to", String(to));
    } else if (date) {
      params.set("date", String(date));
    } else {
      // Por defecto: hoy
      const today = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const d = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
        today.getDate()
      )}`;
      params.set("date", d);
    }

    if (country) params.set("country", String(country));
    if (league) params.set("league", String(league));
    if (status) params.set("status", String(status));
    else params.set("status", "NS"); // sólo partidos no iniciados por defecto

    const url = `https://${APISPORTS_HOST}/fixtures?${params.toString()}`;

    console.log("[/api/fixtures] Llamando a API-FOOTBALL:", url);

    const apiRes = await fetch(url, {
      headers: {
        "x-apisports-key": APISPORTS_KEY,
      },
    });

    const json = await apiRes.json();

    // Loguear errores de la API si vienen
    if (!apiRes.ok || (json && json.errors && Object.keys(json.errors).length)) {
      console.error("[/api/fixtures] Error desde API-FOOTBALL:", {
        status: apiRes.status,
        statusText: apiRes.statusText,
        errors: json && json.errors,
      });
      // No reventamos: devolvemos lista vacía
      return sendJson(res, 200, { items: [] });
    }

    const response = Array.isArray(json?.response) ? json.response : [];

    const items = response.map((r) => ({
      fixtureId: r?.fixture?.id,
      teams: r?.teams || {},
      league: r?.league || {},
      timestamp: r?.fixture?.timestamp || null,
      fixture: r?.fixture || null,
    }));

    console.log(
      "[/api/fixtures] OK – partidos recibidos:",
      items.length,
      "params:",
      Object.fromEntries(params)
    );

    return sendJson(res, 200, { items });
  } catch (err) {
    console.error("[/api/fixtures] EXCEPCIÓN:", err);
    // Para no romper el comparador, devolvemos lista vacía
    return sendJson(res, 200, { items: [] });
  }
};
