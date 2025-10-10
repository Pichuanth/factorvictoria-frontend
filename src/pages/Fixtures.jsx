// src/pages/Fixtures.jsx
import React, { useEffect, useState, useMemo } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || ""; // ej: https://tu-api
const isProd = import.meta.env.PROD;                  // true en Vercel (prod)

const FLAG = (country = "") => {
  const map = {
    ar: "🇦🇷", cl: "🇨🇱", br: "🇧🇷", uy: "🇺🇾", py: "🇵🇾",
    pe: "🇵🇪", co: "🇨🇴", mx: "🇲🇽", es: "🇪🇸", pt: "🇵🇹",
    de: "🇩🇪", it: "🇮🇹", fr: "🇫🇷", gb: "🇬🇧", us: "🇺🇸",
  };
  return map[country?.toLowerCase()] || "🏳️";
};

export default function Fixtures() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [adminToken, setAdminToken] = useState("");

  // Cargar partidos del día
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

  // Sincronizar (solo visible en dev)
  const syncDay = async () => {
    try {
      if (!adminToken) { alert("Ingresa X-ADMIN-TOKEN"); return; }
      setLoading(true);
      const r = await fetch(`${API_BASE}/admin/sync?date=${encodeURIComponent(date)}`, {
        method: "POST",
        headers: { "X-ADMIN-TOKEN": adminToken }
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      alert("Sincronizado OK");
    } catch (e) {
      console.error(e);
      alert("Error al sincronizar");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const txt = q.trim().toLowerCase();
    if (!txt) return rows;
    return rows.filter(r =>
      [r.home, r.away, r.league, r.country].some(v => String(v).toLowerCase().includes(txt))
    );
  }, [q, rows]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">Partidos</h1>

      {/* ADMIN – oculto en producción */}
      {!isProd && (
        <div className="border border-indigo-500/40 rounded-2xl p-4 mb-6 bg-indigo-900/20">
          <p className="text-sm font-semibold text-white mb-2">ADMIN</p>
          <p className="text-xs text-indigo-200 mb-2">TOKEN INTERNO (NO PUBLICAR EN PRODUCCIÓN)</p>
          <input
            className="w-full rounded-xl px-3 py-2 bg-white text-slate-900 mb-3"
            placeholder="X-ADMIN-TOKEN"
            value={adminToken}
            onChange={e => setAdminToken(e.target.value)}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="date"
              className="rounded-xl px-3 py-2 bg-white text-slate-900"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            <button
              onClick={syncDay}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold shadow"
            >
              Sincronizar día a BD
            </button>
          </div>
        </div>
      )}

      {/* Filtros públicos */}
      <div className="border border-white/10 rounded-2xl p-4 mb-4 bg-white/5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="date"
          className="rounded-xl px-3 py-2 bg-white text-slate-900"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <input
          className="flex-1 rounded-xl px-3 py-2 bg-white text-slate-900"
          placeholder="Buscar (equipo / liga / país)"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <div className="text-sm text-white/70">{filtered.length} partidos</div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-sm text-white/90">
          <thead className="bg-gradient-to-r from-amber-400 to-amber-300 text-slate-900">
            <tr className="text-left">
              <th className="px-3 py-2">Hora</th>
              <th className="px-3 py-2">Local</th>
              <th className="px-3 py-2">Visita</th>
              <th className="px-3 py-2">Liga</th>
              <th className="px-3 py-2">País</th>
              <th className="px-3 py-2">Estadio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-white/5">
            {loading && (
              <tr><td className="px-3 py-4" colSpan={6}>Cargando…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td className="px-3 py-4" colSpan={6}>Sin datos</td></tr>
            )}
            {filtered.map((m, i) => (
              <tr key={i}>
                <td className="px-3 py-2 whitespace-nowrap">{m.time || "-"}</td>
                <td className="px-3 py-2">{m.home}</td>
                <td className="px-3 py-2">{m.away}</td>
                <td className="px-3 py-2">{m.league}</td>
                <td className="px-3 py-2">{FLAG(m.country)} {m.country?.toUpperCase()}</td>
                <td className="px-3 py-2">{m.stadium || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
