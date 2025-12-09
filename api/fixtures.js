// api/fixtures.js
import { query } from "./_utils/db"; // mismo helper que ya usas
// IMPORTANTÍSIMO: aquí NO usaremos APISPORTS_KEY. Este endpoint será SOLO BD.

function buildWhere(params) {
  const where = [];
  const values = [];
  let i = 1;

  // rango de fechas
  if (params.from) {
    where.push(`date >= $${i++}`);
    values.push(params.from);
  }
  if (params.to) {
    where.push(`date <= $${i++}`);
    values.push(params.to);
  }

  // status (NS = not started / futuros)
  if (params.status) {
    where.push(`status = $${i++}`);
    values.push(params.status);
  }

  // filtro por país
  if (params.country) {
    where.push(`LOWER(league_country) = LOWER($${i++})`);
    values.push(params.country);
  }

  // texto libre (liga, equipo, etc.)
  if (params.q) {
    where.push(
      `(
        LOWER(league_name)   LIKE LOWER('%' || $${i} || '%')
        OR LOWER(home_team)  LIKE LOWER('%' || $${i} || '%')
        OR LOWER(away_team)  LIKE LOWER('%' || $${i} || '%')
      )`
    );
    values.push(params.q);
    i++;
  }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { whereSQL, values };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { from, to, status, country, q } = req.query || {};
    const { whereSQL, values } = buildWhere({ from, to, status, country, q });

    // IMPORTANTE: ajusta nombres de columnas según tu tabla fixtures
    const sql = `
      SELECT
        fixture_id,
        league_id,
        league_name,
        league_country,
        fixture_date      AS date,
        kickoff_time,
        status,
        home_team,
        away_team,
        league_flag
      FROM fixtures
      ${whereSQL}
      ORDER BY fixture_date ASC, kickoff_time ASC
      LIMIT 500
    `;

    const result = await query(sql, values);

    // Normalizamos un poquito al formato que ya espera el frontend
    const items = result.rows.map((row) => ({
      id: row.fixture_id,
      league: {
        id: row.league_id,
        name: row.league_name,
        country: row.league_country,
        flag: row.league_flag,
      },
      fixture: {
        date: row.date,
      },
      time: row.kickoff_time,
      status: row.status,
      teams: {
        home: { name: row.home_team },
        away: { name: row.away_team },
      },
    }));

    res.status(200).json({ items });
  } catch (err) {
    console.error("Error en /api/fixtures", err);
    res.status(500).json({ error: "Error interno en fixtures" });
  }
}
