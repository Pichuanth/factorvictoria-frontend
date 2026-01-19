// src/components/Simulator.jsx
import React, { useMemo, useState } from "react";
import HudCard from "./HudCard";

const CURRENCIES = [
  { code: "CLP", locale: "es-CL", decimals: 0 },
  { code: "USD", locale: "en-US", decimals: 2 },
  { code: "EUR", locale: "es-ES", decimals: 2 },
  { code: "COP", locale: "es-CO", decimals: 0 },
  { code: "MXN", locale: "es-MX", decimals: 2 },
];

function parseMoneyToNumber(input) {
  const digits = String(input || "").replace(/[^\d]/g, "");
  return Number(digits || 0);
}

function moneyFormatter(locale, currency, decimals) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function Simulator({
  bg = null,
  overlayVariant = "casillasSharp",
  imgStyle = { objectPosition: "60% 35%" },
  className = "",
}) {
  const [currency, setCurrency] = useState("CLP");
  const [amountNum, setAmountNum] = useState(0);

  const cfg = useMemo(
    () => CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0],
    [currency]
  );

  const fmt = useMemo(
    () => moneyFormatter(cfg.locale, cfg.code, cfg.decimals),
    [cfg.locale, cfg.code, cfg.decimals]
  );

  const amountDisplay = useMemo(() => {
    if (!amountNum) return "";
    return fmt.format(amountNum);
  }, [amountNum, fmt]);

  const plans = [
    { label: "Mensual", mult: 10 },
    { label: "Trimestral", mult: 20 },
    { label: "Anual", mult: 50 },
    { label: "Vitalicio", mult: 100 },
  ];

  // contenido del simulador (lo reutilizamos en 2 wrappers)
  const CONTENT = (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Simula tus ganancias
          </h2>
          <p className="text-white/80 mt-1">
            Ingresa tu monto y calcula cuánto podrías ganar según tu plan.
          </p>
        </div>

        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="shrink-0 rounded-2xl border border-white/10 bg-white/5 text-white px-3 py-2"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code} className="text-slate-900">
              {c.code}
            </option>
          ))}
        </select>
      </div>

      <input
        inputMode="numeric"
        placeholder={`Monto a apostar (${currency})`}
        className="mt-4 w-full px-4 py-3 rounded-2xl bg-white text-slate-900"
        value={amountDisplay}
        onChange={(e) => {
          const n = parseMoneyToNumber(e.target.value);
          setAmountNum(n);
        }}
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-4 mt-6">
        {plans.map((p) => {
          const win = amountNum * p.mult;

          return (
            <div
              key={p.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="text-white font-semibold">
                {p.label} · x{p.mult}
              </div>
              <div className="text-sm text-white/70">
                Apuesta: {fmt.format(amountNum)}
              </div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                Ganancia: {fmt.format(win)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-white/70">
        (Simulación simple: monto × multiplicador)
      </div>
    </div>
  );

  // Si llega bg => usamos HudCard (igual que comparador)
  if (bg) {
    return (
      <section className={`max-w-6xl mx-auto ${className}`}>
        <HudCard
          bg={bg}
          overlayVariant={overlayVariant}
          glow="gold"
          className="overflow-hidden"
          imgStyle={imgStyle}
        >
          {CONTENT}
        </HudCard>
      </section>
    );
  }

  // Fallback: sin bg, mantiene el estilo actual (card simple)
  return (
    <section className={`max-w-6xl mx-auto ${className}`}>
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/25 backdrop-blur-md">
        {CONTENT}
      </div>
    </section>
  );
}
