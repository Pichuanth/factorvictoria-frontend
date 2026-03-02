import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

export default function Checkout() {
  const [sp] = useSearchParams();

  const plan = (sp.get("plan") || "mensual").toLowerCase();
  const planLabel = useMemo(() => {
    if (plan === "trimestral" || plan === "3m" || plan === "3") return "Trimestral";
    if (plan === "anual" || plan === "12m" || plan === "12") return "Anual";
    if (plan === "vitalicio" || plan === "lifetime") return "Vitalicio";
    return "Mensual";
  }, [plan]);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [activationLink, setActivationLink] = useState("");

  // Prefill email from URL (?email=) or localStorage, but only if it looks like an email.
  useEffect(() => {
    const fromQuery = (sp.get("email") || "").trim();
    const fromStorage = (localStorage.getItem("fv_email") || "").trim();
    const candidate = fromQuery || fromStorage;

    if (candidate && candidate.includes("@") && candidate.includes(".")) {
      setEmail(candidate);
    } else {
      setEmail("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (email) localStorage.setItem("fv_email", email);
    } catch {}
  }, [email]);

  const startPay = async () => {
    setErr("");
    setSuccess("");
    setActivationLink("");

    const cleanEmail = (email || "").trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErr("Ingresa un correo válido.");
      return;
    }

    setLoading(true);
    try {
      // Tu endpoint de backend que crea el pago (Flow / etc.)
      const r = await fetch(`/api/pay/create?plan=${encodeURIComponent(plan)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(data?.error || "No se pudo iniciar el pago.");
      }

      // Esperamos que el backend devuelva una URL para redirigir al checkout (Flow / Webpay / etc.)
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      // Fallback: si devuelve un link de activación directa (best effort)
      if (data?.activationLink) {
        setActivationLink(data.activationLink);
        setSuccess("Pago iniciado. Revisa tu correo para activar tu cuenta.");
        return;
      }

      setSuccess("Pago iniciado. Revisa tu correo para continuar.");
    } catch (e) {
      setErr(e?.message || "Error iniciando pago.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-2xl bg-[#0b1020]/70 border border-white/10 p-6 shadow-xl">
        <div className="text-center">
          <img
            src="/logo-fv.png"
            alt="Factor Victoria"
            className="mx-auto mb-5 w-28 md:w-36"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="text-2xl font-semibold text-white">Pagar membresía</div>
          <div className="text-sm text-white/60 mt-1">{planLabel}</div>
        </div>

        <div className="space-y-3 mt-6">
          <input
            type="email"
            inputMode="email"
            className="w-full rounded-xl bg-white border border-white/10 px-4 py-3 text-[#0b1020] outline-none focus:border-white/30"
            placeholder="correo@gmail.com (obligatorio)"
            value={email || ""}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          {success ? <div className="text-sm text-emerald-300">{success}</div> : null}

          {activationLink ? (
            <div className="text-sm text-white/80">
              Si no te llega el correo, puedes activar aquí:{" "}
              <a className="text-[#E6C464] underline" href={activationLink}>
                Crear contraseña
              </a>
            </div>
          ) : null}

          {err ? <div className="text-sm text-red-400">{err}</div> : null}

          {/* Confianza / conversión */}
          <button
            type="button"
            onClick={startPay}
            disabled={loading || !email}
            className={[
              "w-full rounded-xl px-4 py-3 font-semibold text-white shadow transition",
              "bg-emerald-600 hover:bg-emerald-700",
              "disabled:opacity-60 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {loading ? "Abriendo pago..." : "Activar Membresía Ahora"}
          </button>

          <div className="mt-4 rounded-xl bg-white px-4 py-4 text-[#0b1020]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold">
                <img
                  src="/pago_seguro.png"
                  alt="Pago seguro"
                  className="h-6 w-6 object-contain"
                  loading="lazy"
                />
                <span>Pago 100% seguro</span>
              </div>

              <img
                src="/Logo_pagos.png"
                alt="Medios de pago"
                className="h-7 w-auto object-contain"
                loading="lazy"
              />
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                  ✓
                </span>
                <span>Confirmación automática</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                  ✓
                </span>
                <span>Acceso inmediato</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                  ✓
                </span>
                <span>Cancela cuando quieras</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-white/60">
            Después del pago, vuelve a{" "}
            <Link className="text-[#E6C464] underline" to="/login">
              Iniciar sesión
            </Link>{" "}
            con el mismo correo.
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
