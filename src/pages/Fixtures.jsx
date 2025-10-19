// src/pages/Fixtures.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const IS_PROD = import.meta.env.PROD;

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

  const handleSync = async () => {
    try {
      if (!adminToken) { alert("Ingresa X-ADMIN-TOKEN"); return; }
      setLoading(true);
      const r = await fetch(`${API_BASE}/admin/sync?date=${encodeURIComponent(date)}`, {
        method: "POST",
        headers: { "X-ADMIN-TOKEN": adminToken },
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
    <div className="bg-slate-900 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">Partidos</h1>

        {/* ADMIN (solo en dev) */}
        {!IS_PROD && (
          <div className="rounded-3xl border border-slate-700/40 p-4 md:p-6 bg-slate-900/40 mb-6">
            <h3 className="text-white font-semibold mb-2">ADMIN</h3>
            <p className="text-xs text-slate-300 mb-2">TOKEN INTERNO (NO PUBLICAR EN PRODUCCIÓN)</p>

            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="X-ADMIN-TOKEN"
              className="w-full rounded-2xl bg-white/95 text-slate-900 px-4 py-3 mb-3"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="date"
                className="rounded-xl px-3 py-2 bg-[#E6C464] text-slate-900"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                onClick={handleSync}
                className="rounded-xl px-4 py-2 bg-[#E6C464] text-slate-900 font-semibold"
              >
                Sincronizar día a BD
              </button>
            </div>
          </div>
        )}

        {/* Filtros públicos */}
        <div className="border border-white/10 rounded-2xl p-4 mb-4 bg-white/5 flex flex-col gap-3">
          {/* FECHA: marfil */}
          <input
            type="date"
            className="rounded-xl px-3 py-2 bg-[#FFFFF0] text-slate-900"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {/* BUSCADOR: marfil */}
          <input
            className="rounded-xl px-3 py-2 bg-[#FFFFF0] text-slate-900 placeholder-slate-700"
            placeholder="Buscar (equipo / liga / país)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {/* Botón Buscar: dorado (se mantiene) */}
          <button
            onClick={() => {/* el filtrado ya es reactivo; botón como confirmación UX */}}
            className="rounded-xl px-4 py-2 bg-[#E6C464] text-slate-900 font-semibold self-start"
          >
            Buscar
          </button>

          <div className="text-sm text-white/70">{filtered.length} partidos</div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-sm text-white/90">
            <thead className="bg-[#E6C464] text-slate-900">
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
              {loading && <tr><td colSpan={6} className="px-3 py-4">Cargando…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4">Sin datos</td></tr>
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
    </div>
  );
}
