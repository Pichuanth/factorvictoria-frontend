import afetch from "./_afetch.js";

// GET /api/fixtures?date=YYYY-MM-DD&country=Chile|q=123 (league id)
export default async function handler(req, res) {
  try {
    const date = (req.query.date || "").trim();
    const q    = (req.query.country || req.query.q || "").trim();

    if (!date) return res.status(400).json({ error: "date requerido (YYYY-MM-DD)" });

    const params = { date };
    // si q es numérico, lo usamos como id de liga; si no, probamos por país
    if (/^\d+$/.test(q)) params.league = q;
    else if (q) params.country = q;

    const json = await afetch("/fixtures", params);
    res.status(200).json(Array.isArray(json?.response) ? json.response : []);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
