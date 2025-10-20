// src/pages/Comparator.jsx
import React, { useState } from "react";
import Simulator from "../components/Simulator";
import { useAuth, PLAN_RANK } from "../lib/auth";

const RANK_TO_MAX = {
  [PLAN_RANK.BASIC]: 10,       // $19.990
  [PLAN_RANK.PRO]: 20,         // $44.990
  [PLAN_RANK.POPULAR]: 50,     // $99.990 (Anual)
  [PLAN_RANK.VITALICIO]: 100,  // $249.990
};

export default function Comparator() {
  const { isLoggedIn, user } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");

  // 🔒 Bloqueo con FONDO AZUL MARINO también
  if (!isLoggedIn) {
    return (
      <div className="bg-slate-900 min-h-screen">
        <section className="max-w-6xl mx-auto px-4 py-12 text-white">
          <h1 className="text-2xl font-bold mb-3">Comparador</h1>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            Para generar cuotas, primero{" "}
            <a href="/#planes" className="text-[#E6C464] underline">
              compra una membresía
            </a>{" "}
            e inicia sesión.
          </div>
        </section>
      </div>
    );
  }

  const rank = user?.rank;
  const maxX = RANK_TO_MAX[rank] ?? 10;
  const ladder = [10, 20, 50, 100];
  const locked = ladder.filter((x) => x > maxX);

  return (
    <div className="bg-slate-900 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-8 text-white">
        {/* Barra: fecha + búsqueda + generar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl px-3 py-2 bg-[#FFFFF0] text-slate-900"
          />
          <input
            placeholder="Equipo / liga"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 bg-[#FFFFF0] text-slate-900"
          />
          <button className="rounded-xl px-4 py-2 bg-[#E6C464] text-slate-900 font-semibold">
            Generar
          </button>
        </div>

        {/* Resumen por plan */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            "Cuota segura (regalo) 1.5–3 · 90–95% acierto",
            `Cuota generada x${maxX}`,
            "Probabilidad de acierto (prom.) 90%",
            "Desfase del mercado",
          ].map((t, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-white font-semibold">{t}</div>
              <div className="text-white/70 text-sm mt-1">
                Próximamente: resultados basados en tus filtros.
              </div>
            </div>
          ))}
        </div>

        {/* Upsell bloqueado */}
        {locked.length > 0 && (
          <div className="mt-8">
            <h3 className="text-white text-xl font-bold mb-3">
              ¿Estás listo para mejorar tus ganancias?
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {locked.map((x) => (
                <div
                  key={x}
                  onClick={() => (window.location.href = "/#planes")}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-70 hover:opacity-100 cursor-pointer"
                >
                  <div className="text-white font-semibold">Plan x{x}</div>
                  <div className="text-sm text-white/70">
                    Contenido bloqueado 🔒 (mejorar plan)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulador */}
        <div className="mt-10">
          <Simulator />
        </div>
      </section>
    </div>
  );
}
