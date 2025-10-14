// src/components/Simulator.jsx
import React, { useState } from "react";
import copy from "../copy";

const fmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default function Simulator() {
  const [montoStr, setMontoStr] = useState("");

  const toNumber = (s) => Number(String(s).replace(/[^\d]/g, "")) || 0;
  const planes = copy.planes;

  const monto = toNumber(montoStr);

  return (
    <section className="max-w-6xl mx-auto">
      <div className="rounded-3xl bg-slate-900/70 border border-white/10 p-6 md:p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          {copy.home.simuladorTitulo}
        </h2>
        <p className="text-white/80 mt-1">{copy.home.simuladorSub}</p>

        <input
          inputMode="numeric"
          placeholder="Monto a apostar (CLP)"
          className="mt-4 w-full md:w-96 px-4 py-3 rounded-2xl bg-white text-slate-900"
          value={montoStr ? fmt.format(monto).replace("$", "$") : ""}
          onChange={(e) => setMontoStr(e.target.value)}
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {planes.map((p) => {
            // multiplicadores por plan (x20/x50/x100)
            const mult =
              p.id === "x20" ? 20 : p.id === "x50" ? 50 : p.id === "x100" ? 100 : 10;
            const ganancia = monto * mult;

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="text-white font-semibold">
                  {p.title} · x{mult}
                </div>
                <div className="text-sm text-white/70">
                  Apuesta: {fmt.format(monto)}
                </div>
                <div className="text-lg font-bold text-emerald-400 mt-1">
                  Ganancia: {fmt.format(ganancia)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
