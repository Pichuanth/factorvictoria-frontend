// frontend/api/admin-fixtures-sync.js
import { query } from "./_utils/db";
import fetch from "node-fetch";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const APISPORTS_KEY = process.env.APISPORTS_KEY;
const APISPORTS_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";

function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = req.headers["x-admin-token"] || req.query.token;
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!APISPORTS_KEY) {
    res.status(500).json({ error: "Falta APISPORTS_KEY" });
    return;
  }

  try {
    const today = new Date();
    const dateParam = req.query.date || toYYYYMMDD(today);

    const url = `https://${APISPORTS_HOST}/fixtures?date=${dateParam}&timezone=America/Santiago`;

    const apiRes = await fetch(url, {
      headers: {
        "x-apisports-key": APISPORTS_KEY,
      },
    });

    if (!apiRes.ok) {
      throw new Error(`API-FOOTBALL HTTP ${apiRes.status}`);
    }

    const json = await apiRes.json();
    const list = Array.isArray(json.response) ? json.response : [];

    for (const fx of list) {
      const fixtureId = fx.fixture?.id;
      if (!fixtureId) continue;

      await query(
        `
        INSERT INTO fixtures (
          fixture_id,
          league_id,
          league_name,
          league_country,
          league_flag,
          fixture_date,
          kickoff_time,
          status,
          home_team,
          away_team
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
        )
        ON CONFLICT (fixture_id) DO UPDATE SET
          league_id      = EXCLUDED.league_id,
          league_name    = EXCLUDED.league_name,
          league_country = EXCLUDED.league_country,
          league_flag    = EXCLUDED.league_flag,
          fixture_date   = EXCLUDED.fixture_date,
          kickoff_time   = EXCLUDED.kickoff_time,
          status         = EXCLUDED.status,
          home_team      = EXCLUDED.home_team,
          away_team      = EXCLUDED.away_team
        `,
        [
          fixtureId,
          fx.league?.id || null,
          fx.league?.name || null,
          fx.league?.country || null,
          fx.league?.flag || null,
          fx.fixture?.date?.slice(0, 10) || null,
          fx.fixture?.date?.slice(11, 16) || null,
          fx.fixture?.status?.short || null,
          fx.teams?.home?.name || null,
          fx.teams?.away?.name || null,
        ]
      );
    }

    res.status(200).json({ ok: true, synced: list.length, date: dateParam });
  } catch (err) {
    console.error("SYNC ERROR", err);
    res.status(500).json({ error: "Error en sync", detail: err.message });
  }
}
