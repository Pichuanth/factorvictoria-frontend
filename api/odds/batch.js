router.post("/odds/batch", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.fixtures) ? req.body.fixtures : [];
    const unique = [...new Set(ids.map(String).filter(Boolean))].slice(0, 40);

    const results = {};
    for (const fixture of unique) {
      const r = await fetch(`http://localhost:3001/api/odds?fixture=${encodeURIComponent(fixture)}`);
      const j = await r.json();
      results[fixture] = j;
    }
    res.json({ items: results });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});
