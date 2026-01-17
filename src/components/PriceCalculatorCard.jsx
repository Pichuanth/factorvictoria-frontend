import React, { useMemo, useState } from "react";
import HudCard from "./HudCard";

const GOLD = "#E6C464";

function asset(path) {
  const base = import.meta.env.BASE_URL || "/";
  const clean = String(path || "").replace(/^\/+/, "");
  return `${base}${clean}`;
}

const BG_DINERO = asset("hero.dinero.png");

export default function PriceCalculatorCard() {
  const [stake, setStake] = useState(10000);
  const [odd, setOdd] = useState(10);

  const payout = Number(stake || 0) * Number(odd || 0);

  const clp = useMemo(
    () => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }),
    []
  );

  return (
    <HudCard bg={BG_DINERO} overlayVariant="casillasSharp" glow="gold" className="mt-6">
      <div className="p-5 md:p-6">
        <div className="text-sm font-semibold text-slate-100">Calculadora rápida</div>
        <div className="text-xs text-slate-300 mt-1">Monto × cuota = retorno estimado (simple).</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="text-xs text-slate-300">Monto (CLP)</div>
            <input
              value={stake}
              onChange={(e) => setStake(Number(String(e.target.value).replace(/[^\d]/g, "")) || 0)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="text-xs text-slate-300">Cuota</div>
            <input
              value={odd}
              onChange={(e) => setOdd(Number(String(e.target.value).replace(/[^\d.]/g, "")) || 0)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="text-xs text-slate-300">Retorno</div>
            <div className="mt-2 text-lg font-bold" style={{ color: GOLD }}>
              {clp.format(payout)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">No incluye comisión.</div>
          </div>
        </div>
      </div>
    </HudCard>
  );
}
