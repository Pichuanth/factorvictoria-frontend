// src/pages/Comparador.jsx
import React from "react";
import Simulator from "../components/Simulator";

export default function Comparador() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-white">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">Comparador de cuotas</h1>

      {/* Módulo abierto X10 (demo) */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">Plan X10 (incluido)</h2>
        <p className="text-white/80 text-sm">
          Busca equipos/mercados y revisa la cuota base (X10). Para planes superiores se desbloquean mejoras.
        </p>
      </div>

      {/* Upsell bloqueado para X20/X50/X100 */}
      <div className="grid sm:grid-cols-3 gap-4">
        {["X20", "X50", "X100"].map((tier) => (
          <div key={tier} className="rounded-2xl border border-amber-500/30 bg-amber-400/10 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{tier}</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-amber-300 text-slate-900">Bloqueado</span>
            </div>
            <p className="text-white/70 text-sm mt-2">
              Mejora tus cuotas y desbloquea estrategias. <br /> Compra el plan para ver este módulo.
            </p>
          </div>
        ))}
      </div>

      {/* Simulador también visible aquí */}
      <div className="mt-10">
        <Simulator />
      </div>
    </div>
  );
}
