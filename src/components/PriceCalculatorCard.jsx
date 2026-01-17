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
  const raw = String(s ?? "").replace(/[^\d.,]/g, "");
  if (!raw) return 0;

  const hasDot = raw.includes(".");
  const hasComma = raw.includes(",");

  let normalized = raw;
  if (hasDot && hasComma) normalized = raw.replace(/\./g, "").replace(",", ".");
  else if (hasComma && !hasDot) normalized = raw.replace(",", ".");

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export default function PriceCalculatorCard({ bg }) {
  const [currency, setCurrency] = useState("CLP");
  const cfg = useMemo(() => CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0], [currency]);

  const [amount, setAmount] = useState(0);
  const [amountInput, setAmountInput] = useState("");

  const [odd, setOdd] = useState(10);

  const retorno = useMemo(() => {
    const a = Number(amount || 0);
    const o = Number(odd || 0);
    if (!Number.isFinite(a) || !Number.isFinite(o)) return 0;
    return a * o;
  }, [amount, odd]);

  function handleAmountChange(e) {
    const nextStr = e.target.value;
    setAmountInput(nextStr);

    const n = parseAmountToNumber(nextStr);
    const final = cfg.decimals === 0 ? Math.round(n) : n;
    setAmount(final);
  }

  function handleAmountBlur() {
    if (!amount) {
      setAmountInput("");
      return;
    }
    setAmountInput(formatMoney(amount, currency));
  }

  function handleAmountFocus() {
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
              <div className="text-lg font-bold text-slate-100">Calculadora rápida</div>
              <div className="mt-1 text-sm text-slate-300">Monto × cuota = retorno estimado (simple).</div>
            </div>

            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
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

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Monto ({currency})</label>
              <input
                value={amountInput}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                onFocus={handleAmountFocus}
                inputMode="decimal"
                className="w-full rounded-2xl bg-slate-950/35 text-white px-4 py-3 border border-white/10"
                placeholder={currency === "CLP" || currency === "COP" ? "10000" : "10.00"}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Cuota</label>
              <input
                value={odd}
                onChange={(e) => setOdd(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-2xl bg-slate-950/35 text-white px-4 py-3 border border-white/10"
                placeholder="10"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <div className="text-xs text-slate-300">Retorno</div>
              <div className="mt-1 text-2xl font-bold text-yellow-200">{formatMoney(retorno, currency)}</div>
              <div className="mt-1 text-xs text-slate-400">No incluye comisión.</div>
            </div>
          </div>
        </div>
      </HudCard>
    </section>
  );
}
