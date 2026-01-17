import React, { useState } from "react";

export default function PriceCalculatorCard() {
  const [stake, setStake] = useState(10000);
  const [odd, setOdd] = useState(10);

  const payout = Number(stake || 0) * Number(odd || 0);

  return (
    <div
      className="mt-6 rounded-3xl border border-white/10 bg-slate-950/25 backdrop-blur-md overflow-hidden"
      style={{
        backgroundColor: "#132A23",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.03) inset, 0 18px 60px rgba(0,0,0,0.55), 0 0 85px rgba(230,196,100,0.30)",
      }}
    >
      <div className="p-5">
        <div className="text-sm font-semibold text-slate-100">Calculadora rápida</div>
        <div className="text-xs text-slate-300 mt-1">Monto × cuota</div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value) || 0)}
            className="rounded-xl bg-white/10 px-3 py-2 text-white border border-white/10 outline-none"
          />
          <input
            type="number"
            value={odd}
            onChange={(e) => setOdd(Number(e.target.value) || 0)}
            className="rounded-xl bg-white/10 px-3 py-2 text-white border border-white/10 outline-none"
          />
        </div>

        <div className="mt-4 text-lg font-bold text-emerald-300">
          Retorno: {payout.toLocaleString("es-CL")}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">No incluye comisión.</div>
      </div>
    </div>
  );
}
