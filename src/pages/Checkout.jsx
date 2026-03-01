// src/pages/Checkout.jsx
import React, { useMemo, useState, useEffect } from "react";
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

  // Prefill email from query or localStorage to reduce steps
  useEffect(() => {
    const qEmail = sp.get("email");
    const saved = localStorage.getItem("fv_email");
    const initial = (qEmail || saved || "").trim().toLowerCase();
    if (initial) setEmail(initial);
  }, [sp]);

  // Keep email stored for future one-click checkout
  useEffect(() => {
    const e = (email || "").trim().toLowerCase();
    if (e) localStorage.setItem("fv_email", e);
  }, [email]);

  // Nota: el retorno desde Flow redirige a /login?email=...&paid=1
  // La activación real ocurre por /confirm (webhook). Aquí no hacemos verificación extra.

  // One-click checkout: if ?auto=1 and we already have an email, start payment immediately
  useEffect(() => {
    const auto = sp.get("auto") === "1";
    if (!auto) return;
    const e = (email || "").trim().toLowerCase();
    if (!planId || !e) return;
    // avoid loops on back/refresh
    if (sp.get("flow") === "return") return;

    const t = setTimeout(() => {
      startPay();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, planId, email]);


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
        body: JSON.stringify({ planId, email: e, returnPath: "/checkout" }),
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
          {/* Logo (mismo que inicio/login) */}
          <img
            src="/logo-fv.png"
            alt="Factor Victoria"
            className="mx-auto mb-5 w-28 md:w-36"
            onError={(e) => {
              // si no existe el logo, evita romper la UI
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="text-2xl font-semibold text-white">Pagar membresía</div>
          <div className="text-sm text-white/60 mt-1">{planLabel}</div>
        </div>

        <div className="space-y-3">
          <input
            className="w-full rounded-xl bg-white border border-white/10 px-4 py-3 text-[#0b1020] outline-none focus:border-white/30"
            placeholder="correo@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          {err ? <div className="text-sm text-red-400">{err}</div> : null}

          <button
            onClick={startPay}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 disabled:opacity-60 transition-colors"
          >
            {loading ? "Abriendo pago..." : "Pagar con Débito/Créd{/* Confianza / conversión */}
          <div className="mt-4 rounded-xl bg-white/95 p-3 text-slate-900">
            <div className="flex items-center gap-2 font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                ✓
              </span>
              Pago seguro
            </div>

            <div className="mt-2 text-sm text-slate-700">
              Débito / Crédito • Confirmación automática • Acceso inmediato con tu correo
            </div>

            <img
              src="/logo_pagos.png"
              alt="Medios de pago"
              className="mt-3 h-10 w-auto"
              loading="lazy"
            />
          </div>
 correo
            </div>
          </div>

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
