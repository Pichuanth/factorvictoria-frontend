// src/components/Simulator.jsx
import React, { useState } from "react";
import copy from "../copy";

const parseMonto = (s) => {
  const n = Number(String(s).replace(/[^\d]/g, "")) || 0;
  return Math.max(0, n);
};
const formatCLP = (n) => "$" + Number(n || 0).toLocaleString("es-CL");

export default function Simulator() {
  const [montoRaw, setMontoRaw] = useState("");

  const monto = parseMonto(montoRaw); // número limpio

  return (
    <section className="rounded-3xl bg-slate-900/70 border border-white/10 p-6 md:p-8">
      <h2 className="text-2xl md:text-3xl font-bold text-white">
        {copy.home.simuladorTitulo}
      </h2>
      <p className="text-white/80 mt-1">{copy.home.simuladorSub}</p>

      <input
        inputMode="numeric"
        placeholder="Monto a apostar (CLP)"
        className="mt-4 w-full md:w-96 px-4 py-3 rounded-2xl bg-white text-slate-900"
        value={montoRaw}
        onChange={(e) => setMontoRaw(e.target.value)}
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {copy.planes.map((p) => {
          const ganancia = monto * (p.multiplo || 1);
          return (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-white font-semibold">
                {p.title} · x{p.multiplo}
              </div>
              <div className="text-sm text-white/70">
                Apuesta: {formatCLP(monto)}
              </div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                Ganancia: {formatCLP(ganancia)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
