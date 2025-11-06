// frontend/src/pages/Comparator.jsx
import { useState } from "react";
import { getSmartPicks } from "../api/fixtures"; // deja este helper como lo tienes
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Comparator() {
  const { isLoggedIn, planId = "vitalicio" } = useAuth() || {};
  const [date, setDate] = useState(todayStr());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  async function onGenerate() {
    try {
      setLoading(true);
      setErr("");
      if (!isLoggedIn) throw new Error("Primero inicia sesión o compra una membresía.");
      const r = await getSmartPicks(date, planId, q); // devuelve { gift?, parlay? }
      setData(r);
    } catch (e) {
      setErr(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // target por plan
  const target =
    data?.parlay?.target ??
    (planId === "vitalicio" ? 100 : planId === "anual" ? 50 : planId === "trimestral" ? 20 : 10);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* Filtro superior */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10 placeholder:text-slate-300/70"
          />
          <input
            placeholder="Equipo / liga / país (ej: Chile, Premier, 140)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10 placeholder:text-slate-300/70"
          />
          <button
            onClick={onGenerate}
            disabled={loading}
            className="rounded-2xl font-semibold px-4 py-2 disabled:opacity-60"
            style={{ backgroundColor: GOLD, color: "#0f172a" }}
          >
            {loading ? "Generando..." : "Generar"}
          </button>
        </div>
        {err && <div className="text-red-400 mt-3">{err}</div>}
      </section>

      {/* Cuota segura (regalo) */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">
          Cuota segura (Regalo) x1.5–x3 · 90–95% acierto
        </h2>
        {data?.gift ? (
          <div className="text-slate-200 mt-2">
            <div className="font-semibold">{data.gift.match}</div>
            <div>
              {data.gift.market} · {data.gift.pick} ·{" "}
              <span className="font-bold">(x{data.gift.odd})</span>
            </div>
          </div>
        ) : (
          <p className="text-slate-300 mt-2">Próximamente: resultados basados en tus filtros.</p>
        )}
      </section>

      {/* Cuota generada xN */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">Cuota generada x{target}</h2>
        <p className="text-slate-300 mt-1">TU PLAN: {String(planId).toUpperCase()}</p>

        {data?.parlay?.selections?.length ? (
          <>
            <ul className="mt-3 space-y-1 text-slate-200">
              {data.parlay.selections.map((s, i) => (
                <li key={i}>
                  <span className="font-semibold">{s.match}</span> — {s.market} · {s.pick} ·{" "}
                  <span className="font-bold">(x{s.odd})</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-white font-bold">
              Cuota total: x{data.parlay.totalOdd}
            </div>
          </>
        ) : (
          <div className="text-slate-400 mt-2">Aún no hay picks para este día o filtro.</div>
        )}
      </section>

      {/* Placeholders premium */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">Árbitros más tarjeteros</h2>
        <p className="text-slate-300 mt-2">Disponible con tu plan.</p>
      </section>

      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">Cuota desfase del mercado</h2>
        <p className="text-slate-300 mt-2">Disponible con tu plan.</p>
      </section>
    </div>
  );
}
