// frontend/src/components/Fixtures.jsx
import { useEffect, useMemo, useState } from "react";

const API_BASE =
  (typeof localStorage !== "undefined" && localStorage.getItem("apiBase")) ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:3001";

export default function Fixtures() {
  const [date, setDate]         = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [q, setQ]               = useState("");

  // --- Panel DEV (opcional) ---
  const [adminToken, setAdminToken] = useState(
    () => (typeof localStorage !== "undefined" && localStorage.getItem("adminToken")) || ""
  );
  const [syncMsg, setSyncMsg] = useState("");
  function saveToken(t) {
    setAdminToken(t);
    try { localStorage.setItem("adminToken", t); } catch {}
  }
  async function doSync() {
    if (!adminToken) { setSyncMsg("Falta admin token"); return; }
    setSyncMsg("Sincronizando…");
    try {
      const url = `${API_BASE}/admin/fixtures/sync?date=${date}`;
      const r = await fetch(url, { headers: { "x-admin-token": adminToken } });
      const j = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(j));
      setSyncMsg(`OK: guardados ${j.saved} partidos`);
    } catch (e) {
      setSyncMsg(`Error: ${String(e.message || e)}`);
    }
  }
  // --- fin Panel DEV ---

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      try {
        const url = `${API_BASE}/api/fixtures?date=${date}`;
        const r   = await fetch(url);
        const data = await r.json();
        if (!abort) setRows(Array.isArray(data.fixtures) ? data.fixtures : []);
      } catch (e) {
        console.error(e);
        if (!abort) setRows([]);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
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
      <h1>Partidos</h1>

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

      {/* ===== Panel DEV opcional (quítalo en prod) ===== */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0", background: "#fafafa", padding: 8, border: "1px dashed #ddd" }}>
        <strong>DEV:</strong>
        <input
          style={{ width: 320 }}
          placeholder="x-admin-token (no lo expongas en prod)"
          value={adminToken}
          onChange={(e) => saveToken(e.target.value)}
        />
        <button onClick={doSync}>Sincronizar día a BD</button>
        <span className="muted">{syncMsg}</span>
      </div>
      {/* ============================================== */}

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
                    {new Date(r.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
