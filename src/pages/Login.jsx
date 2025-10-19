// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn } from "../lib/auth";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [msg, setMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    const res = await signIn(email, pwd);
    if (!res.ok) {
      setMsg(res.error || "No se pudo iniciar sesión.");
      return;
    }
    // Éxito → al comparador (puedes cambiar a donde quieras)
    nav("/app");
  };

  return (
    <div className="min-h-[70vh] bg-slate-900 flex items-center">
      <div className="max-w-md mx-auto w-full px-4 py-10">
        {/* Logo centrado y título más discreto */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <img
            src="/logo-fv.png"
            alt="Factor Victoria"
            className="w-20 h-20 md:w-24 md:h-24 object-contain"
          />
          <h1 className="text-white text-2xl font-bold">Iniciar sesión</h1>
        </div>

        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Correo"
            className="w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <div className="relative mt-3">
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Contraseña"
              className="w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900 pr-12"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="current-password"
              required
            />
            {/* Ojito mostrar/ocultar */}
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-700/70 hover:text-slate-900"
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          </div>

        {/* enlace olvido */}
          <div className="mt-2 text-xs text-white/70">¿Olvidaste tu contraseña?</div>

          {/* Mensaje de error */}
          {msg && (
            <div className="mt-3 text-sm text-rose-300">
              {msg}
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
      </div>
    </div>
  );
}
