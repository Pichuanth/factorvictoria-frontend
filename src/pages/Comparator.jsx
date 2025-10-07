import { useMemo, useState } from "react";

const API_BASE =
  (typeof localStorage !== "undefined" && localStorage.getItem("apiBase")) ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:3001";

const TIERS = [
  { key: "x10", name: "x10", price: 19990, locked: false },
  { key: "x20", name: "x20", price: 44990, locked: true  },
  { key: "x50", name: "x50", price: 99990, locked: true  },
  { key: "x100",name: "x100",price: 250000,locked: true  },
];

export default function Comparator(){
  const [search, setSearch] = useState("");
  const [objective, setObjective] = useState("x10");
  const [tolerance, setTolerance] = useState(10); // %
  const [minLegs, setMinLegs] = useState(3);
  const [maxLegs, setMaxLegs] = useState(6);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const selectedTier = useMemo(
    () => TIERS.find(t => t.key === objective) || TIERS[0],
    [objective]
  );

  const generate = async () => {
    setErr("");
    setLoading(true);
    setRows([]);
    try {
      const params = new URLSearchParams({
        q: search,
        objective,
        tolerance: String(tolerance),
        minLegs: String(minLegs),
        maxLegs: String(maxLegs),
      });
      const r = await fetch(`${API_BASE}/api/combos/generate?${params.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setErr("Error: Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Comparador de Cuotas</h1>

      {/* Buscador + filtros superiores */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          placeholder="Buscar (equipo/mercado/selección)"
          className="border rounded px-3 py-2 flex-1 min-w-[240px]"
        />
        <div className="text-gray-600">{rows.length} filas</div>
      </div>

      {/* Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {TIERS.map(t => {
          const isActive = t.key === selectedTier.key;
          const classes = t.locked
            ? "tier-card-locked"
            : "bg-white border-gray-200";
          return (
            <div
              key={t.key}
              className={`rounded-2xl border p-5 shadow-sm cursor-default ${classes} ${isActive ? "ring-2 ring-green-500/70" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{t.name}</div>
                {t.locked ? (
                  <span className="lock text-sm">🔒</span>
                ) : isActive ? (
                  <span className="text-green-600 text-lg">✔</span>
                ) : null}
              </div>
              <div className={`mt-1 ${t.locked ? "price" : "text-gray-700"}`}>
                ${t.price.toLocaleString("es-CL")}
              </div>
              {!t.locked && (
                <button
                  onClick={()=>setObjective(t.key)}
                  className="mt-3 fv-btn-primary w-full"
                >
                  Incluido
                </button>
              )}
              {t.locked && (
                <button className="mt-3 w-full rounded-xl px-4 py-3 font-semibold bg-white/80 border hover:bg-white">
                  Mejorar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Parámetros de generación */}
      <div className="bg-gray-50 rounded-xl p-4 border mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Objetivo</label>
            <select
              className="border rounded px-2 py-2"
              value={objective}
              onChange={(e)=>setObjective(e.target.value)}
            >
              <option value="x10">Objetivo x10</option>
              <option value="x20">Objetivo x20</option>
              <option value="x50">Objetivo x50</option>
              <option value="x100">Objetivo x100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Tolerancia</label>
            <select
              className="border rounded px-2 py-2"
              value={tolerance}
              onChange={(e)=>setTolerance(Number(e.target.value))}
            >
              <option value={5}>±5%</option>
              <option value={10}>±10%</option>
              <option value={15}>±15%</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Min legs</label>
            <input
              type="number"
              className="border rounded px-2 py-2 w-20"
              value={minLegs}
              min={1}
              onChange={(e)=>setMinLegs(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Max legs</label>
            <input
              type="number"
              className="border rounded px-2 py-2 w-20"
              value={maxLegs}
              min={minLegs}
              onChange={(e)=>setMaxLegs(Number(e.target.value))}
            />
          </div>

          <button onClick={generate} className="fv-btn-primary ml-auto disabled:opacity-60">
            {loading ? "Generando…" : "Generar"}
          </button>
        </div>
      </div>

      {/* Error */}
      {err && <div className="text-red-600 mb-3">{err}</div>}

      {/* Tabla de resultados */}
      <div className="bg-white rounded-xl border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Local</th>
                <th className="py-2 px-3">Visita</th>
                <th className="py-2 px-3">Bookmaker</th>
                <th className="py-2 px-3">Mercado</th>
                <th className="py-2 px-3">Selección</th>
                <th className="py-2 px-3">Cuota</th>
                <th className="py-2 px-3">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="text-gray-500 py-3 px-3" colSpan={8}>Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="text-gray-500 py-3 px-3" colSpan={8}>Sin datos.</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 px-3">{r.date || "-"}</td>
                    <td className="py-2 px-3">{r.home || "-"}</td>
                    <td className="py-2 px-3">{r.away || "-"}</td>
                    <td className="py-2 px-3">{r.bookmaker || "-"}</td>
                    <td className="py-2 px-3">{r.market || "-"}</td>
                    <td className="py-2 px-3">{r.selection || "-"}</td>
                    <td className="py-2 px-3">{r.odds ?? "-"}</td>
                    <td className="py-2 px-3">{r.updatedAt || "-"}</td>
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
