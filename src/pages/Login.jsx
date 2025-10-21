// src/pages/Login.jsx
import React, { useState } from "react";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    setErr("");
    const ok = login(email, pass);
    if (!ok) setErr("Correo o contraseña inválidos.");
  };

  return (
    <div className="min-h-[70vh] bg-slate-900 flex items-center">
      <div className="max-w-md mx-auto w-full px-4 py-10">
        {/* Logo centrado grande */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo-fv.png" alt="Factor Victoria" className="w-24 h-24 object-contain" />
        </div>

        <h1 className="text-white text-2xl font-bold mb-2">Iniciar sesión</h1>

        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full px-4 py-3 rounded-2xl bg-white text-slate-900"
            autoComplete="username"
            required
          />

          <div className="relative mt-3">
            <input
              type={show ? "text" : "password"}
              placeholder="Contraseña"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white text-slate-900 pr-12"
              autoComplete="current-password"
              required
            />

            {/* Botón ojo (abierto/tachado) */}
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {show ? (
                // ojo abierto
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                // ojo tachado
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-3.2 4.2" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>

          <div className="mt-2 text-xs text-white/70">¿Olvidaste tu contraseña?</div>

          {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

          <button className="mt-4 w-full px-4 py-3 rounded-2xl bg-amber-400 text-slate-900 font-semibold">
            Entrar
          </button>

          <div className="mt-4 text-sm text-white/80">
            ¿Aún no tienes cuenta?{" "}
            <a href="/#planes" className="text-amber-300 underline">
              Regístrate
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
