// frontend/api/fixtures.js  (serverless)
import afetch from "./_afetch";

export default async function handler(req, res) {
  try {
    const { date, league, country } = req.query;
    if (!date) return res.status(400).json({ error: "date requerido (YYYY-MM-DD)" });

    const params = { date };
    if (league)  params.league  = league;     // si te pasan id de liga
    if (country) params.country = country;    // si te pasan nombre de país

    const json = await afetch("/fixtures", params);
    return res.status(200).json(json?.response || []);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
