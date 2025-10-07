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
  const [token, setToken] = useState("");          // <- admin token (solo DEV)
  const [syncing, setSyncing] = useState(false);   // <- estado de sync

  // Cargar fixtures del día
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

  // Filtro por texto
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((x) =>
      [x.home, x.away, x.league, x.country].some((v) =>
        String(v || "").toLowerCase().includes(t)
      )
    );
  }, [rows, q]);

  // Sincronizar día a BD (solo visible en DEV)
  const syncDay = async () => {
    try {
      setSyncing(true);
      const url = `${API_BASE}/api/fixtures/sync?date=${encodeURIComponent(date)}`;
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token || "",
        },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      alert("✅ Día sincronizado con la base de datos.");
    } catch (e) {
      console.error(e);
      alert("❌ No se pudo sincronizar. Revisa el token/servidor.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <h1 className="text-2xl font-bold mb-3">Partidos</h1>

      {/* Barra de filtros */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          placeholder="Buscar (equipo/liga/país)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border rounded px-3 py-2 flex-1 min-w-[220px]"
        />
        <span className="text-gray-500">
          {loading ? "Cargando…" : `${filtered.length} partidos`}
        </span>
      </div>

      {/* Panel Administrador (solo en desarrollo) */}
      {import.meta.env.DEV && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 mb-4">
          <div className="font-semibold mb-2">Administrador</div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="x-admin-token (no exponer en producción)"
              className="border rounded px-3 py-2 flex-1 min-w-[260px]"
            />
            <button
              onClick={syncDay}
              disabled={syncing}
              className="fv-btn-primary disabled:opacity-60"
            >
              {syncing ? "Sincronizando…" : "Sincronizar día a BD"}
            </button>
          </div>
          <div className="text-xs mt-2">Este bloque solo aparece en entorno de desarrollo.</div>
        </div>
      )}

      {/* Tabla en contenedor gris */}
      <div className="bg-gray-50 rounded-xl p-4 border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-3">Hora</th>
                <th className="py-2 pr-3">Local</th>
                <th className="py-2 pr-3">Visita</th>
                <th className="py-2 pr-3">Liga</th>
                <th className="py-2 pr-3">País</th>
                <th className="py-2 pr-3">Estadio</th>
                <th className="py-2 pr-3">TV</th>
                <th className="py-2 pr-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="text-gray-500 py-3" colSpan={8}>Cargando…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="text-gray-500 py-3" colSpan={8}>Sin partidos.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 pr-3">
                      {new Date(r.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-3">{r.home}</td>
                    <td className="py-2 pr-3">{r.away}</td>
                    <td className="py-2 pr-3">{r.league}</td>
                    <td className="py-2 pr-3">{r.country}</td>
                    <td className="py-2 pr-3">{r.venue || "-"}</td>
                    <td className="py-2 pr-3">{r.tv || "-"}</td>
                    <td className="py-2 pr-3">{r.status || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
