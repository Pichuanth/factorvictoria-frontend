import React, { useMemo, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "") || "https://factorvictoria-backend.vercel.app";
const GOLD = "#E6C464";

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a21.77 21.77 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

export default function Activate() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { login } = useAuth();

  const token = sp.get("token") || "";
  const emailFromLink = useMemo(() => (sp.get("email") || "").trim().toLowerCase(), [sp]);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [resendEmail, setResendEmail] = useState(emailFromLink);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  const invalidTokenState = /token/i.test(err);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOkMsg("");
    setResendMsg("");

    if (!token) return setErr("Token inválido o faltante.");
    if (!pw || pw.length < 6) return setErr("La contraseña debe tener al menos 6 caracteres.");
    if (pw !== pw2) return setErr("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        setErr(data?.error || "No se pudo activar la cuenta.");
        return;
      }
      setOkMsg("Cuenta activada ✅ Iniciando sesión...");
      if (data?.email) {
        await login(data.email, pw);
      }
      nav("/perfil");
    } catch {
      setErr("Error activando la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  async function onResendLink() {
    const email = (resendEmail || emailFromLink || "").trim().toLowerCase();
    setResendMsg("");
    setErr("");
    if (!email) {
      setErr("Ingresa tu correo para enviarte un enlace nuevo.");
      return;
    }

    setResending(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/create-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        setErr(data?.error || "No se pudo enviar un enlace nuevo.");
        return;
      }
      setResendMsg("Te enviamos un enlace nuevo a tu correo. Revisa bandeja, promociones o spam.");
    } catch {
      setErr("No se pudo enviar un enlace nuevo.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-extrabold">Crear contraseña</h1>
        <p className="mt-2 text-sm text-white/70">
          Esto activa tu cuenta y deja tu plan listo para usar.
        </p>

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="text-sm text-white/70">Contraseña</label>
            <div className="mt-1 relative">
              <input
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                type={showPw ? "text" : "password"}
                className="w-full rounded-xl bg-white text-black px-4 py-2 pr-12"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-slate-500"
                aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-white/70">Repetir contraseña</label>
            <div className="mt-1 relative">
              <input
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                type={showPw2 ? "text" : "password"}
                className="w-full rounded-xl bg-white text-black px-4 py-2 pr-12"
                placeholder="Repite tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPw2((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-slate-500"
                aria-label={showPw2 ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <EyeIcon open={showPw2} />
              </button>
            </div>
          </div>

          {okMsg ? <div className="text-sm text-emerald-300">{okMsg}</div> : null}
          {err ? <div className="text-sm text-red-400">{err}</div> : null}
          {resendMsg ? <div className="text-sm text-emerald-300">{resendMsg}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl font-semibold py-3 disabled:opacity-60"
            style={{ backgroundColor: GOLD, color: "#0b1020" }}
          >
            {loading ? "Activando..." : "Activar cuenta"}
          </button>
        </form>

        {invalidTokenState ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-semibold text-white">¿Tu enlace expiró o ya fue usado?</div>
            <p className="mt-1 text-sm text-white/70">
              Te enviamos uno nuevo para que no tengas que pedir ayuda.
            </p>
            <div className="mt-3">
              <label className="text-sm text-white/70">Correo</label>
              <input
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                type="email"
                className="mt-1 w-full rounded-xl bg-white text-black px-4 py-2"
                placeholder="tu@correo.com"
              />
            </div>
            <button
              type="button"
              disabled={resending}
              onClick={onResendLink}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/10 py-3 font-semibold text-white disabled:opacity-60"
            >
              {resending ? "Enviando enlace nuevo..." : "Enviar nuevo enlace"}
            </button>
          </div>
        ) : null}

        <div className="mt-4 text-sm text-white/70">
          ¿Ya tienes cuenta? <Link className="underline" to="/login">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}
