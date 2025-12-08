// frontend/api/fixtures.js
// Serverless API para traer fixtures desde API-FOOTBALL

const API_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const API_KEY = process.env.APISPORTS_KEY;

// Helpers para manejar fechas YYYY-MM-DD
function toDate(str) {
  const [y, m, d] = String(str || "").split("-");
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
}

// Genera array de fechas día a día entre from y to (ambos incluidos)
function buildDateRange(fromStr, toStr, maxDays = 10) {
  const start = toDate(fromStr);
  const end = toDate(toStr);

  if (!start || !end) return [];

  const dates = [];
  let current = start;
  let steps = 0;

  while (current <= end && steps < maxDays) {
    dates.push(formatDate(current));
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000); // +1 día
    steps += 1;
  }

  return dates;
}

export default async function handler(req, res) {
  if (!API_KEY) {
    return res
      .status(500)
      .json({ error: "APISPORTS_KEY no está configurada en Vercel." });
  }

  try {
    let { from, to, date, status, country } = req.query;

    // Soportar el viejo parámetro `date`
    if (date && !from && !to) {
      from = date;
      to = date;
    }

    // Defaults tolerantes:
    // - si no viene nada -> hoy
    // - si viene sólo from -> usamos ese mismo valor como to
    // - si viene sólo to -> usamos ese mismo valor como from
    if (!from && !to) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      from = today;
      to = today;
    } else if (from && !to) {
      to = from;
    } else if (!from && to) {
      from = to;
    }

    // Construimos el rango de fechas día a día
    let dates = buildDateRange(from, to, 10);
    if (!dates.length) {
      // Fallback ultra seguro: hoy
      const today = new Date().toISOString().slice(0, 10);
      dates = [today];
    }

    const headers = {
      "x-apisports-key": API_KEY,
      "x-rapidapi-key": API_KEY, // por si alguno de los dos cabe
      "x-rapidapi-host": API_HOST,
    };

    const allItems = [];

    // Llamamos a API-FOOTBALL UNA VEZ POR DÍA usando `date`
    for (const day of dates) {
      const search = new URLSearchParams();
      search.set("date", day);
      search.set("timezone", "America/Santiago");

      if (status) {
        search.set("status", status);
      }
      if (country) {
        search.set("country", country);
      }

      const url = `https://${API_HOST}/fixtures?${search.toString()}`;

      const apiRes = await fetch(url, { headers });

      if (!apiRes.ok) {
        const bodyText = await apiRes.text().catch(() => "");
        console.error("Error API-FOOTBALL", apiRes.status, bodyText);
        return res.status(apiRes.status).json({
          error: "Error consultando API-FOOTBALL",
          status: apiRes.status,
          body: bodyText,
        });
      }

      const json = await apiRes.json();
      const response = Array.isArray(json?.response) ? json.response : [];

      const mapped = response.map((fx) => ({
        fixtureId: fx.fixture?.id,
        date: fx.fixture?.date,
        timestamp: fx.fixture?.timestamp,
        league: {
          id: fx.league?.id,
          name: fx.league?.name,
          country: fx.league?.country,
        },
        teams: {
          home: fx.teams?.home?.name,
          away: fx.teams?.away?.name,
        },
        venue: fx.fixture?.venue?.name || null,
        country: fx.league?.country || null,
        raw: fx,
      }));

      allItems.push(...mapped);
    }

    return res.status(200).json({ items: allItems });
  } catch (err) {
    console.error("Error en /api/fixtures", err);
    return res.status(500).json({
      error: String(err?.message || err || "Error desconocido"),
    });
  }
}
