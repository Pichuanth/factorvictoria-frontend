// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      navigate("/app");
    } catch {
      setErr("Correo o contraseña inválidos");
    }
  };

  return (
    <div className="min-h-[70vh] bg-slate-900 flex items-center">
      <form onSubmit={onSubmit} className="max-w-md mx-auto w-full px-4 py-10">
        <div className="flex flex-col items-center gap-4 mb-6">
          <img src="/logo-fv.png" alt="Factor Victoria" className="w-24 h-24 object-contain" />
          <h1 className="text-white text-2xl font-bold">Iniciar sesión</h1>
        </div>

        {err && <div className="mb-4 text-red-300 text-sm">{err}</div>}

        <input
          type="email"
          placeholder="Correo"
          className="mt-2 w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="relative mt-3">
          <input
            type={show ? "text" : "password"}
            placeholder="Contraseña"
            className="w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900 pr-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/10"
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            title={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {/* ojo simple (sin “monito”) */}
            {show ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 3l18 18" strokeWidth="2" />
                <path d="M10.58 10.58a2 2 0 102.83 2.83" strokeWidth="2" />
                <path d="M16.88 13.88A10.94 10.94 0 0012 12c-2.7 0-5.1 1.06-6.88 2.88" strokeWidth="2" />
                <path d="M9.88 6.12A10.94 10.94 0 0112 6c4.84 0 8.94 3.4 10 6- .27 .68-.67 1.31-1.17 1.88" strokeWidth="2" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" strokeWidth="2" />
              </svg>
            )}
          </button>
        </div>

        <div className="mt-2 text-xs text-white/70">¿Olvidaste tu contraseña?</div>

        <button className="mt-4 w-full px-4 py-3 rounded-2xl bg-[#E6C464] text-slate-900 font-semibold">
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
  );
}
