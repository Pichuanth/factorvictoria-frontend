// src/components/PriceCalculatorCard.jsx
import React, { useMemo, useState } from "react";

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

export default function PriceCalculatorCard({ bg }) {
  const [currency, setCurrency] = useState("CLP");
  const [amountNum, setAmountNum] = useState(0);
  const [oddStr, setOddStr] = useState("10");

  const cfg = useMemo(
    () => CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0],
    [currency]
  );

  const fmt = useMemo(
    () => moneyFormatter(cfg.locale, cfg.code, cfg.decimals),
    [cfg.locale, cfg.code, cfg.decimals]
  );

  const odd = useMemo(() => {
    const n = Number(String(oddStr || "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [oddStr]);

  const amountDisplay = useMemo(() => {
    if (!amountNum) return "";
    return fmt.format(amountNum);
  }, [amountNum, fmt]);

  const retorno = useMemo(() => {
    const r = amountNum * odd;
    return Number.isFinite(r) ? r : 0;
  }, [amountNum, odd]);

  return (
    <section className="max-w-6xl mx-auto mt-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/25 backdrop-blur-md">
        {bg ? (
          <img
            src={bg}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
        ) : null}

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white">
                Calculadora rápida
              </h3>
              <p className="text-white/80 mt-1">
                Monto × cuota = retorno estimado (simple).
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

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/70 mb-2">Monto ({currency})</div>
              <input
                inputMode="numeric"
                className="w-full rounded-xl bg-white text-slate-900 px-3 py-3"
                placeholder={currency === "CLP" ? "$10.000" : "$10.00"}
                value={amountDisplay}
                onChange={(e) => setAmountNum(parseMoneyToNumber(e.target.value))}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/70 mb-2">Cuota</div>
              <input
                inputMode="decimal"
                className="w-full rounded-xl bg-white text-slate-900 px-3 py-3"
                placeholder="10"
                value={oddStr}
                onChange={(e) => setOddStr(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-white/70">Retorno</div>
            <div className="mt-1 text-2xl font-bold text-yellow-200">
              {fmt.format(retorno)}
            </div>
            <div className="mt-1 text-xs text-white/70">No incluye comisión.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
