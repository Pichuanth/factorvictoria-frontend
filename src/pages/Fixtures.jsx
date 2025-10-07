import { useEffect, useState, useMemo } from "react";

const API_BASE =
  (typeof localStorage !== "undefined" && localStorage.getItem("apiBase")) ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:3001";

export default function Fixtures() {
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const url = `${API_BASE}/api/fixtures?date=${encodeURIComponent(date)}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setRows(Array.isArray(data.fixtures) ? data.fixtures : []);
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((x) =>
      [x.home, x.away, x.league, x.country].some((v) =>
        String(v || "").toLowerCase().includes(t)
      )
    );
  }, [rows, q]);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{marginBottom:12}}>Partidos</h1>

      {/* Caja ADMIN */}
      <div className="admin-box" style={{marginBottom:12}}>
        <span className="admin-tag">ADMIN</span>
        <div style={{fontWeight:700}}>Token interno (no publicar en producción):</div>
        <input
          style={{borderRadius:12,border:"1px solid #d1d5db",padding:"8px 10px"}}
          placeholder="x-admin-token"
        />
        <button className="btn-navy" style={{marginLeft:"auto"}}>Sincronizar día a BD</button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          placeholder="Buscar (equipo/liga/país)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="muted">
          {loading ? "Cargando…" : `${filtered.length} partidos`}
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Local</th>
              <th>Visita</th>
              <th>Liga</th>
              <th>País</th>
              <th>Estadio</th>
              <th>TV</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="muted" colSpan={8}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="muted" colSpan={8}>Sin partidos.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    {new Date(r.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{r.home}</td>
                  <td>{r.away}</td>
                  <td>{r.league}</td>
                  <td>{r.country}</td>
                  <td>{r.venue || "-"}</td>
                  <td>{r.tv || "-"}</td>
                  <td>{r.status || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
