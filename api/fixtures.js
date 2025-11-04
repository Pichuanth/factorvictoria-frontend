// frontend/api/fixtures.js
import { afetch } from "./_afetch.js";

// GET /api/fixtures?date=YYYY-MM-DD&country=Chile&league=71  (league opcional)
// También puedes pasar q= (si es numérico lo usamos como league id)
export default async function handler(req, res) {
  try {
    const { date, country, league, q } = req.query || {};
    if (!date) return res.status(400).json({ error: "date es requerido (YYYY-MM-DD)" });

    const params = { date };
    if (country) params.country = country;
    if (league)  params.league  = league;
    if (!league && q && /^\d+$/.test(String(q).trim())) params.league = String(q).trim();

    const data = await afetch("/fixtures", params);
    res.status(200).json(Array.isArray(data?.response) ? data.response : []);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
