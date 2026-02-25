// src/pages/Checkout.jsx
import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const PLAN_LABEL = {
  mensual: "Mensual",
  trimestral: "Trimestral (+1 mes regalo)",
  anual: "Anual",
  vitalicio: "Vitalicio",
};

export default function Checkout() {
  const [sp] = useSearchParams();
  const planId = sp.get("plan") || "";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const planLabel = useMemo(() => PLAN_LABEL[planId] || "Plan", [planId]);

  const startPay = async () => {
    setErr("");
    const e = (email || "").trim().toLowerCase();
    if (!planId) return setErr("Plan inválido. Vuelve a seleccionar un plan.");
    if (!e) return setErr("Ingresa tu correo.");

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/pay/flow/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, email: e }),
      });
      const data = await r.json();
      if (!data?.ok || !data?.url) {
        setErr(data?.error || "No se pudo iniciar el pago.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setErr("No se pudo conectar al servidor.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1020] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0f1730] border border-white/10 p-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="text-2xl font-semibold text-white">Pagar membresía</div>
          <div className="text-sm text-white/60 mt-1">{planLabel}</div>
        </div>

        <div className="space-y-3">
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:border-white/30"
            placeholder="correo@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          {err ? <div className="text-sm text-red-400">{err}</div> : null}

          <button
            onClick={startPay}
            disabled={loading}
            className="w-full rounded-xl bg-[#E6C464] text-[#0b1020] font-semibold py-3 disabled:opacity-60"
          >
            {loading ? "Abriendo Flow..." : "Pagar con Flow"}
          </button>

          <div className="text-sm text-white/60">
            Después del pago, vuelve a <Link className="text-[#E6C464] underline" to="/login">Iniciar sesión</Link> con el mismo correo.
          </div>

          <div className="text-sm">
            <Link className="text-white/70 underline" to="/#planes">
              Volver a planes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
