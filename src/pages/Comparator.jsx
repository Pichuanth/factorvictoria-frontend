// frontend/src/pages/Comparator.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Mapea la membresía a objetivo de cuota */
function targetFromPlan(planRaw) {
  const id = String(planRaw || "").toLowerCase();
  if (["vitalicio", "lifetime", "pro-250", "x100"].some((k) => id.includes(k))) return 100;
  if (["anual", "annual", "x50"].some((k) => id.includes(k))) return 50;
  if (["trimestral", "quarter", "3m", "x20"].some((k) => id.includes(k))) return 20;
  if (["mensual", "monthly", "basico", "basic", "x10"].some((k) => id.includes(k))) return 10;
  return null;
}

export default function Comparator() {
  const { isLoggedIn, user } = useAuth();

  /* ---------- BLOQUEO SI NO ESTÁ LOGUEADO ---------- */
  if (!isLoggedIn) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Comparador bloqueado</h1>
          <p className="text-slate-300 mt-2">
            Para generar cuotas y combinadas, primero compra tu membresía e inicia sesión.
          </p>
          <div className="mt-4">
            <Link
              to="/"
              className="inline-block rounded-2xl px-5 py-2 font-semibold"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
            >
              Ir a Inicio (ver membresías)
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ---------- VALIDAR PLAN DEL USUARIO ---------- */
  const planGuess =
    user?.planId || user?.plan?.id || user?.plan?.slug || user?.plan || user?.membership || user?.tier || "";
  const target = targetFromPlan(planGuess);

  if (!target) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Actualiza tu membresía</h1>
          <p className="text-slate-300 mt-2">
            Tu plan actual no permite usar el comparador. Elige una membresía para desbloquearlo.
          </p>
          <div className="mt-4">
            <Link
              to="/"
              className="inline-block rounded-2xl px-5 py-2 font-semibold"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
            >
              Ver planes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ---------- ESTADO UI ---------- */
  const [date, setDate] = useState(toYYYYMMDD(new Date()));
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  /* ---------- DEMO onGenerate (mientras conectamos API real) ---------- */
  async function onGenerate() {
    try {
      setLoading(true);
      setErr("");

      // DEMO: genera un regalo + 3 selecciones con 1X2 si existe target
      const demoGift = {
        match: "Equipo A vs Equipo B",
        market: "1X2",
        pick: "1",
        odd: 1.75,
      };

      const baseSel = [
        { match: "Partido 1", market: "1X2", pick: "1", odd: 1.35 },
        { match: "Partido 2", market: "1X2", pick: "X", odd: 3.10 },
        { match: "Partido 3", market: "1X2", pick: "2", odd: 1.85 },
      ];

      let total = baseSel.reduce((acc, s) => acc * s.odd, 1);
      // si el target es alto, agrega placeholders
      const extra = [];
      while (total < (target >= 20 ? 20 : 10) && extra.length < 3) {
        extra.push({ match: `Extra ${extra.length + 1}`, market: "1X2", pick: "1", odd: 1.5 });
        total *= 1.5;
      }

      setData({
        gift: demoGift,
        parlay: {
          target,
          selections: [...baseSel, ...extra],
          totalOdd: Number(total.toFixed(2)),
        },
      });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  /* ---------- UI ---------- */
  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      {/* Filtros */}
      <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
          />
          <input
            placeholder="Equipo / liga / país (ej: Chile, Premier, 140)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
          />
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="rounded-2xl font-semibold px-4 py-2"
            style={{ backgroundColor: GOLD, color: "#0f172a", cursor: loading ? "not-allowed" : "pointer" }}
            aria-label="Generar cuotas"
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
            <div>
              {data.gift.market} · {data.gift.pick} · <span className="font-bold">(x{data.gift.odd})</span>
            </div>
          </div>
        ) : (
          <div className="text-white/60 mt-2">Próximamente: resultados basados en tus filtros.</div>
        )}
      </div>

      {/* Parlay */}
      <div className="mt-5 rounded-3xl bg-white/5 border border-white/10 p-4">
        <div className="text-white text-xl font-bold">Cuota generada x{target}</div>
        <div className="text-white/60 text-sm mt-1">Tu plan: {String(planGuess || "").toUpperCase()}</div>

        {data?.parlay?.selections?.length ? (
          <>
            <ul className="mt-3 space-y-1 text-white/90">
              {data.parlay.selections.map((s, i) => (
                <li key={i}>
                  <span className="font-semibold">{s.match}</span> — {s.market} · {s.pick} ·{" "}
                  <span className="font-bold">(x{s.odd})</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-white font-bold">Cuota total: x{data.parlay.totalOdd}</div>
          </>
        ) : (
          <div className="text-white/60 mt-2">Aún no hay picks para este día o filtro.</div>
        )}
      </div>

      {/* Placeholders premium */}
      <div className="mt-5 rounded-3xl bg-white/5 border border-white/10 p-4 text-white/70">
        <div className="text-white text-xl font-bold">Árbitros más tarjeteros</div>
        <div className="mt-1">Disponible con tu plan.</div>
      </div>
      <div className="mt-5 rounded-3xl bg-white/5 border border-white/10 p-4 text-white/70">
        <div className="text-white text-xl font-bold">Cuota desfase del mercado</div>
        <div className="mt-1">Disponible con tu plan.</div>
      </div>
    </main>
  );
}
