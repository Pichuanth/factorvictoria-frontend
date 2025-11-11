// frontend/src/pages/Comparator.jsx
import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

/* Util */
function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* Lee ?plan=10|20|50|100 (atajo útil para demos) */
function targetFromQuery() {
  const sp = new URLSearchParams(window.location.search);
  const p = sp.get("plan");
  if (!p) return null;
  const n = Number(String(p).replace(/[^\d]/g, ""));
  return [10, 20, 50, 100].includes(n) ? n : null;
}

/* Mapea membresía a objetivo de cuota */
function targetFromPlan(planRaw) {
  const id = String(planRaw || "").toLowerCase().trim();

  // cobertura amplia de variantes
  if (/(vitalici|vitalicio|lifetime|pro-250|x100|100)/.test(id)) return 100;
  if (/(anual|annual|x50|50)/.test(id)) return 50;
  if (/(trimestral|quarter|3m|x20|20)/.test(id)) return 20;
  if (/(mensual|monthly|basico|básico|basic|x10|10|basic)/.test(id)) return 10;

  return null;
}

export default function Comparator() {
  const { isLoggedIn, user } = useAuth();
  const [searchParams] = useSearchParams(); // (por si lo necesitas luego)

  /* ---------- BLOQUEO PARA NO LOGUEADOS ---------- */
  if (!isLoggedIn) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
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
      </div>
    );
  }

  /* ---------- USUARIO LOGUEADO: VALIDAR PLAN ---------- */
  // Soporta tanto tu Auth demo (planId) como posibles variantes
  const planGuess =
    user?.planId ||
    user?.plan?.id ||
    user?.plan?.slug ||
    user?.plan ||
    user?.membership ||
    user?.tier ||
    "";

  const queryTarget = targetFromQuery();
  const target = queryTarget ?? targetFromPlan(planGuess);

  if (!target) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
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
      </div>
    );
  }

  /* ---------- ESTADO UI (ok, tiene acceso) ---------- */
  const [date, setDate] = useState(toYYYYMMDD(new Date()));
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  // Placeholder (hasta conectar con picks reales del backend)
  async function onGenerate() {
    try {
      setLoading(true);
      setErr("");

      // DEMO: estructura compatible con lo que mostraremos
      const demo = {
        gift: null, // cuando haya pick x1.5–x3 vendrá aquí
        parlay: {
          target,
          selections: [], // array de { match, market, pick, odd }
          totalOdd: 1.0,
        },
      };

      setData(demo);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
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
        <div className="text-white text-xl font-bold">
          Cuota segura (Regalo) x1.5–x3 · 90–95% acierto
        </div>
        {data?.gift ? (
          <div className="text-white/90 mt-2">
            <div className="font-semibold">{data.gift.match}</div>
            <div>
              {data.gift.market} · {data.gift.pick} ·{" "}
              <span className="font-bold">(x{data.gift.odd})</span>
            </div>
          </div>
        ) : (
          <div className="text-white/60 mt-2">
            Próximamente: resultados basados en tus filtros.
          </div>
        )}
      </div>

      {/* Parlay por plan */}
      <div className="mt-5 rounded-3xl bg-white/5 border border-white/10 p-4">
        <div className="text-white text-xl font-bold">Cuota generada x{target}</div>
        <div className="text-white/60 text-sm mt-1">
          Tu plan: {String(planGuess || "").toUpperCase()}
        </div>

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

      {/* Placeholders premium por ahora */}
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
