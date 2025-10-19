// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, pw);
      nav("/app"); // entra directo al comparador
    } catch (err) {
      setError(err.message || "Error de inicio de sesión");
    }
  };

  return (
    <div className="min-h-[70vh] bg-slate-900 flex items-center">
      <div className="max-w-md mx-auto w-full px-4 py-10">
        {/* Logo centrado grande */}
        <div className="w-full flex justify-center">
          <img src="/logo-fv.png" alt="Factor Victoria" className="w-24 h-24 object-contain" />
        </div>

        {/* Título más discreto pero de nivel encabezado */}
        <h1 className="mt-4 text-white text-2xl font-bold">Iniciar sesión</h1>

        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Correo"
            className="mt-6 w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="mt-3 w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
          />

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
