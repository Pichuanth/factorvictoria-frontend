// src/pages/FixtureDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const API_BASE =
  import.meta?.env?.VITE_API_BASE?.replace(/\/$/, "") ||
  "https://factorvictoria-backend.vercel.app";

export default function FixtureDetail() {
  const { fixtureId } = useParams();
  const nav = useNavigate();
  const { isLoggedIn, user } = useAuth();

  // Regla simple: si está logueado, consideramos “con acceso”
  // (Luego lo afinamos por plan real)
  const canAccess = !!isLoggedIn;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [payload, setPayload] = useState(null);

  const title = useMemo(() => `Fixture #${fixtureId}`, [fixtureId]);

  async function loadStats() {
    setErr("");
    setLoading(true);
    try {
      const url = `${API_BASE}/api/fixture/${fixtureId}/statistics`;
      const r = await fetch(url);
      const data = await r.json().catch(() => null);

      if (!r.ok) {
        setPayload(null);
        setErr(`No se pudieron cargar las estadísticas. (HTTP ${r.status})`);
        return;
      }

      setPayload(data);
    } catch (e) {
      setPayload(null);
      setErr("No se pudieron cargar las estadísticas. (network)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canAccess) loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtureId, canAccess]);

  if (!canAccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-slate-100">
        <div className="rounded-3xl border border-white/10 bg-slate-950/25 p-6">
          <div className="text-lg font-bold">Contenido PRO</div>
          <p className="text-slate-300 mt-2 text-sm">
            Inicia sesión para ver estadísticas avanzadas.
          </p>
          <button
            type="button"
            onClick={() => nav("/login")}
            className="mt-4 px-6 py-3 rounded-full text-sm font-bold"
            style={{ backgroundColor: "#E6C464", color: "#0f172a" }}
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">Estadísticas (PRO)</div>
          <div className="text-xl font-bold">{title}</div>
          {user?.planId ? (
            <div className="text-xs text-slate-400 mt-1">Plan: {user.planId}</div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => nav(-1)}
          className="px-4 py-2 rounded-full text-sm border border-white/15 bg-white/5 hover:bg-white/10 transition"
        >
          Volver
        </button>
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/25 p-6">
        <div className="text-sm font-semibold">Estado</div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={loadStats}
            className="px-4 py-2 rounded-full text-sm border border-white/15 bg-white/5 hover:bg-white/10 transition"
            disabled={loading}
          >
            {loading ? "Cargando..." : "Reintentar"}
          </button>

          <div className="text-xs text-slate-400">
            fixtureId: <span className="text-slate-200 font-semibold">{fixtureId}</span>
          </div>
        </div>

        {err ? <div className="mt-3 text-xs text-rose-300">{err}</div> : null}

        {!err && payload ? (
          <pre className="mt-4 text-[11px] leading-snug text-slate-200 whitespace-pre-wrap">
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : (
          <p className="text-slate-300 text-sm mt-3">
            Aquí mostraremos: forma últimos 5, xG, tarjetas, corners, probabilidad, cuotas, etc.
          </p>
        )}
      </div>
    </div>
  );
}
