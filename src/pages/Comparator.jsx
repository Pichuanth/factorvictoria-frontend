// src/pages/Comparador.jsx
import React, { useState } from "react";
import Simulator from "../components/Simulator";

export default function Comparador() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");

  return (
    <div className="bg-slate-900 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-8 text-white">
        {/* Barra: fecha + búsqueda + generar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl px-3 py-2 bg-amber-400 text-slate-900"
          />
          <input
            placeholder="Equipo / liga"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 bg-amber-400 text-slate-900"
          />
          <button className="rounded-xl px-4 py-2 bg-amber-400 text-slate-900 font-semibold">
            Generar
          </button>
        </div>

        {/* Aquí podrías renderizar las 3 cuotas por partido (mock o real). */}

        {/* Bloques resumen */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            "Cuota segura (regalo) 1.5–3 · 90–95% acierto",
            "Cuota generada x10",
            "Probabilidad de acierto (prom.) 90%",
            "Desfase del mercado (todas las membresías)",
          ].map((t, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-white font-semibold">{t}</div>
              <div className="text-white/70 text-sm mt-1">
                Próximamente: resultados basados en tus filtros.
              </div>
            </div>
          ))}
        </div>

        {/* Upsell bloqueado (ejemplo visual) */}
        <div className="mt-8">
          <h3 className="text-white text-xl font-bold mb-3">
            ¿Estás listo para mejorar tus ganancias?
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {["x20", "x50", "x100"].map((id) => (
              <div
                key={id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-60"
              >
                <div className="text-white font-semibold">Plan {id.toUpperCase()}</div>
                <div className="text-sm text-white/70">Contenido bloqueado 🔒</div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulador al final */}
        <div className="mt-10">
          <Simulator />
        </div>
      </section>
    </div>
  );
}
