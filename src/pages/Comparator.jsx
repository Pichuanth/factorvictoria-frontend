// frontend/src/pages/Comparator.jsx
import { useState } from "react";
import { getSmartPicks } from "../api/fixtures";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export default function Comparator() {
  const { user, isLoggedIn } = useAuth();
  const planId = user?.planId || "basic";

  const [date, setDate] = useState(toYYYYMMDD(new Date()));
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  async function onGenerate() {
    try {
      setLoading(true);
      setErr("");
      if (!isLoggedIn) throw new Error("Primero inicia sesión o compra una membresía.");
      const r = await getSmartPicks(date, planId, q);
      setData(r);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* filtros */}
      <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e)=>setDate(e.target.value)}
            className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
          />
          <input
            placeholder="Equipo / liga / país (ej: Chile, Premier, 140)"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
          />
          <button
            onClick={onGenerate}
            disabled={loading}
            className="rounded-2xl font-semibold px-4 py-2"
            style={{ backgroundColor: GOLD, color: "#0f172a" }}
          >
            {loading ? "Generando..." : "Generar"}
          </button>
        </div>
        {err && <div className="text-red-400 mt-3">{err}</div>}
      </div>

      {/* Regalo */}
      <div className="mt-5 rounded-3xl bg-white/5 border border-white/10 p-4">
        <div className="text-white text-xl font-bold">Cuota segura (Regalo) x1.5–x3 · 90–95% acierto</div>
        {data?.gift ? (
          <div className="text-white/90 mt-2">
            <div className="font-semibold">{data.gift.match}</div>
            <div>{data.gift.market} · {data.gift.pick} · <span className="font-bold">(x{data.gift.odd})</span></div>
          </div>
        ) : (
          <div className="text-white/60 mt-2">Próximamente: resultados basados en tus filtros.</div>
        )}
      </div>

      {/* Parlay */}
      <div className="mt-5 rounded-3xl bg-white/5 border border-white/10 p-4">
        <div className="text-white text-xl font-bold">
          Cuota generada x{data?.parlay?.target ?? (planId==="vitalicio"?100:planId==="anual"?50:planId==="trimestral"?20:10)}
        </div>
        <div className="text-white/60 text-sm mt-1">Tu plan: {planId.toUpperCase()}</div>

        {data?.parlay?.selections?.length ? (
          <>
            <ul className="mt-3 space-y-1 text-white/90">
              {data.parlay.selections.map((s, i) => (
                <li key={i}>
                  <span className="font-semibold">{s.match}</span> — {s.market} · {s.pick} · <span className="font-bold">(x{s.odd})</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-white font-bold">
              Cuota total: x{data.parlay.totalOdd}
            </div>
          </>
        ) : (
          <div className="text-white/60 mt-2">Aún no hay picks para este día o filtro.</div>
        )}
      </div>

      {/* Tarjetas “premium” se mantienen como placeholder por ahora */}
      <div className="mt-5 rounded-3xl bg-white/5 border border-white/10 p-4 text-white/70">
        <div className="text-white text-xl font-bold">Árbitros más tarjeteros</div>
        <div className="mt-1">Disponible con tu plan.</div>
      </div>
      <div className="mt-5 rounded-3xl bg-white/5 border border-white/10 p-4 text-white/70">
        <div className="text-white text-xl font-bold">Cuota desfase del mercado</div>
        <div className="mt-1">Disponible con tu plan.</div>
      </div>
    </div>
  );
}
