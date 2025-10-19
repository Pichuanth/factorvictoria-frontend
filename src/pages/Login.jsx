// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, pw);
      nav("/app");
    } catch (err) {
      setError(err.message || "Error de inicio de sesión");
    }
  };

  return (
    <div className="min-h-[70vh] bg-slate-900 flex items-center">
      <div className="max-w-md mx-auto w-full px-4 py-10">
        {/* Logo centrado grande */}
        <div className="w-full flex justify-center">
          <img
            src="/logo-fv.png"
            alt="Factor Victoria"
            className="w-24 h-24 object-contain"
          />
        </div>

        {/* Título (ligeramente más discreto) */}
        <h1 className="mt-4 text-white text-2xl font-bold">Iniciar sesión</h1>

        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Correo"
            className="mt-6 w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          {/* Password con ojo mostrar/ocultar */}
          <div className="mt-3 relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="Contraseña"
              className="w-full px-4 py-3 pr-12 rounded-2xl bg-[#FFFFF0] text-slate-900"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPw}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-[#E6C464]"
            >
              {/* Ícono ojo (SVG inline) */}
              {showPw ? (
                // ojo abierto
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 stroke-slate-800" viewBox="0 0 24 24" fill="none">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeWidth="1.8"/>
                  <circle cx="12" cy="12" r="3" strokeWidth="1.8"/>
                </svg>
              ) : (
                // ojo tachado
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 stroke-slate-800" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3l18 18" strokeWidth="1.8"/>
                  <path d="M10.6 10.6a3 3 0 104.24 4.24" strokeWidth="1.8"/>
                  <path d="M6.1 6.5C3.9 8 2 12 2 12s3.5 7 10 7c2.1 0 3.9-.6 5.4-1.5" strokeWidth="1.8"/>
                  <path d="M21.9 12s-3.5-7-10-7c-.7 0-1.4.1-2 .2" strokeWidth="1.8"/>
                </svg>
              )}
            </button>
          </div>

          <div className="mt-2 text-xs text-white/70">¿Olvidaste tu contraseña?</div>

          {error && (
            <div className="mt-3 rounded-2xl bg-red-500/10 text-red-200 px-4 py-2 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mt-4 w-full px-4 py-3 rounded-2xl bg-[#E6C464] text-slate-900 font-semibold"
          >
            Entrar
          </button>
        </form>

        <div className="mt-4 text-sm text-white/80">
          ¿Aún no tienes cuenta?{" "}
          <a href="/#planes" className="text-amber-300 underline">
            Regístrate
          </a>
        </div>

        {/* Ayuda: credenciales demo */}
        <div className="mt-6 text-xs text-white/50 space-y-1">
          <div>Demo (solo pruebas):</div>
          <div>basic@demo.cl / demo123</div>
          <div>trimestral@demo.cl / demo123</div>
          <div>anual@demo.cl / demo123</div>
          <div>vitalicio@demo.cl / demo123</div>
          <div>admin@demo.cl / admin123</div>
        </div>
      </div>
    </div>
  );
}
