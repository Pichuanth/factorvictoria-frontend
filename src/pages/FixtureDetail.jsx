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
  const { hasMembership } = useAuth();

  const canAccess = hasMembership;

  const title = useMemo(() => `Fixture #${fixtureId}`, [fixtureId]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!canAccess) return;

    const run = async () => {
      setErr("");
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/fixture/${fixtureId}/statistics`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setStats(data?.statistics || []);
      } catch (e) {
        setErr("No se pudieron cargar las estadísticas.");
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [canAccess, fixtureId]);

  if (!canAccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-slate-100">
        <div className="rounded-3xl border border-white/10 bg-slate-950/25 p-6">
          <div className="text-lg font-bold">Contenido PRO</div>
          <p className="text-slate-300 mt-2 text-sm">
            Necesitas membresía para ver estadísticas avanzadas.
          </p>
          <button
            type="button"
            onClick={() => nav("/#planes")}
            className="mt-4 px-6 py-3 rounded-full text-sm font-bold"
            style={{ backgroundColor: "#E6C464", color: "#0f172a" }}
          >
            Ver planes
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

        <div className="mt-2 text-xs text-slate-400">
          fixtureId: <span className="text-slate-200 font-semibold">{fixtureId}</span>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-300">Cargando estadísticas...</div>
        ) : err ? (
          <div className="mt-4 text-sm text-rose-300">{err}</div>
        ) : !stats || stats.length === 0 ? (
          <div className="mt-4 text-sm text-slate-300">
            Aún no hay estadísticas disponibles para este partido (o no han sido publicadas).
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {stats.map((teamBlock) => (
              <div key={teamBlock?.team?.id || teamBlock?.team?.name} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="text-sm font-bold">{teamBlock?.team?.name || "Equipo"}</div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(teamBlock?.statistics || []).slice(0, 10).map((s, idx) => (
                    <div key={`${s?.type}-${idx}`} className="flex items-center justify-between text-sm border border-white/5 rounded-xl px-3 py-2 bg-white/5">
                      <div className="text-slate-300">{s?.type}</div>
                      <div className="font-semibold text-slate-100">{String(s?.value ?? "—")}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-[11px] text-slate-400">
                  Mostrando primeras 10 stats (luego afinamos: posesión, tiros, corners, faltas, tarjetas, xG si está).
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
