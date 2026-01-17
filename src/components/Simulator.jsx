import React, { useMemo, useState } from "react";
import HudCard from "./HudCard";

const CURRENCIES = [
  { code: "CLP", label: "CLP", locale: "es-CL", decimals: 0 },
  { code: "USD", label: "USD", locale: "en-US", decimals: 2 },
  { code: "EUR", label: "EUR", locale: "es-ES", decimals: 2 },
  { code: "COP", label: "COP", locale: "es-CO", decimals: 0 },
  { code: "MXN", label: "MXN", locale: "es-MX", decimals: 2 },
];

function formatMoney(value, currency) {
  const cfg = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
  const n = Number(value || 0);
  const safe = Number.isFinite(n) ? n : 0;

  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: cfg.code,
    maximumFractionDigits: cfg.decimals,
    minimumFractionDigits: cfg.decimals,
  }).format(safe);
}

function parseAmountToNumber(s) {
  // deja solo dígitos (para CLP/COP) y para USD/EUR/MXN permite punto/coma
  const raw = String(s ?? "").replace(/[^\d.,]/g, "");
  if (!raw) return 0;

  // normaliza: si hay coma y punto, asume separadores mixtos → quita miles y deja decimal
  // si solo hay coma, la tratamos como decimal
  let normalized = raw;
  const hasDot = raw.includes(".");
  const hasComma = raw.includes(",");

  if (hasDot && hasComma) {
    // ej: 1.234,56 -> 1234.56
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && !hasDot) {
    normalized = raw.replace(",", ".");
  } else {
    normalized = raw;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export default function Simulator({ bg }) {
  const [currency, setCurrency] = useState("CLP");
  const cfg = useMemo(() => CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0], [currency]);

  const [amount, setAmount] = useState(0);
  const [amountInput, setAmountInput] = useState(""); // lo que se ve en el input

  const plans = useMemo(
    () => [
      { name: "Mensual", mult: 10 },
      { name: "Trimestral", mult: 20 },
      { name: "Anual", mult: 50 },
      { name: "Vitalicio", mult: 100 },
    ],
    []
  );

  function handleAmountChange(e) {
    const nextStr = e.target.value;
    setAmountInput(nextStr);

    const n = parseAmountToNumber(nextStr);

    // si la moneda es sin decimales, redondea
    const final = cfg.decimals === 0 ? Math.round(n) : n;
    setAmount(final);
  }

  function handleAmountBlur() {
    // al salir del input, lo formateamos bonito ($10.000)
    if (!amount) {
      setAmountInput("");
      return;
    }
    setAmountInput(formatMoney(amount, currency));
  }

  function handleAmountFocus() {
    // al entrar, mostramos número “editable” (sin símbolo) para que sea cómodo
    if (!amount) {
      setAmountInput("");
      return;
    }
    const printable =
      cfg.decimals === 0 ? String(Math.round(amount)) : String(Number(amount).toFixed(cfg.decimals));
    setAmountInput(printable);
  }

  return (
    <section className="mt-6">
      <HudCard bg={bg} overlayVariant="casillas" glow="gold" className="overflow-hidden">
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl md:text-2xl font-bold text-slate-100">Simula tus ganancias</div>
              <div className="mt-1 text-sm text-slate-200">
                Ingresa tu monto y calcula cuánto podrías ganar según tu plan.
              </div>
            </div>

            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                // re-formatea el input al cambiar moneda
                setTimeout(() => {
                  if (amount) setAmountInput(formatMoney(amount, e.target.value));
                }, 0);
              }}
              className="rounded-full px-4 py-2 text-sm bg-slate-950/40 border border-white/10 text-slate-100"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <input
              value={amountInput}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              onFocus={handleAmountFocus}
              inputMode="decimal"
              placeholder={`Monto a apostar (${currency})`}
              className="w-full rounded-2xl bg-white/10 text-white px-4 py-4 border border-white/10 text-lg"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plans.map((p) => {
              const win = amount * p.mult;
              return (
                <div key={p.name} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <div className="text-slate-100 font-semibold">
                    {p.name} · x{p.mult}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">Apuesta: {formatMoney(amount, currency)}</div>
                  <div className="mt-1 text-lg font-bold text-emerald-300">Ganancia: {formatMoney(win, currency)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </HudCard>
    </section>
  );
}
