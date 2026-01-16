import React, { useState } from "react";
import HudCard from "./HudCard"; // ajusta si aplica

export default function PriceCalculatorCard() {
  const [stake, setStake] = useState(10000);
  const [odd, setOdd] = useState(10);

  const payout = stake * odd;

  return (
    <HudCard bg={null} bgColor="#132A23" overlayVariant="casillasSharp" glow="gold">
      <div className="p-5">
        <div className="text-sm font-semibold text-slate-100">Calculadora rápida</div>
        <div className="text-xs text-slate-300 mt-1">Monto × cuota</div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="rounded-xl bg-white/10 px-3 py-2 text-white"
          />
          <input
            type="number"
            value={odd}
            onChange={(e) => setOdd(Number(e.target.value))}
            className="rounded-xl bg-white/10 px-3 py-2 text-white"
          />
        </div>

        <div className="mt-4 text-lg font-bold text-emerald-300">
          Retorno: ${payout.toLocaleString("es-CL")}
        </div>
      </div>
    </HudCard>
  );
}
