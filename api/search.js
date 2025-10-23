const afetch = require("./_afetch");

module.exports = async (req, res) => {
  try {
    const { q = "" } = req.query;
    if (!q || q.length < 2) return res.status(200).json({ teams: [], leagues: [], countries: [] });

    const [teams, leagues, countries] = await Promise.all([
      afetch("/teams", { search: q }),
      afetch("/leagues", { search: q }),
      afetch("/countries", { name: q }),
    ]);

    res.status(200).json({ teams, leagues, countries });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
