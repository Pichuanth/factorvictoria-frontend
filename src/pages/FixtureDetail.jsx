// src/pages/FixtureDetail.jsx
import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function FixtureDetail() {
  const { fixtureId } = useParams();
  const nav = useNavigate();
  const { hasMembership } = useAuth();

  const canAccess = hasMembership;

  const title = useMemo(() => `Fixture #${fixtureId}`, [fixtureId]);

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
        <p className="text-slate-300 text-sm mt-2">
          Aquí mostraremos: forma últimos 5, goles esperados, tarjetas, corners, probabilidad, cuotas, etc.
        </p>

        <div className="mt-4 text-xs text-slate-400">
          fixtureId: <span className="text-slate-200 font-semibold">{fixtureId}</span>
        </div>
      </div>
    </div>
  );
}
