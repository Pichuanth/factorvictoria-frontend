// src/pages/Login.jsx
import React, { useState } from "react";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      window.location.href = "/app";
    } catch (e) {
      setErr("Correo o contraseña inválidos");
    }
  };

  return (
    <div className="min-h-[70vh] bg-slate-900 flex items-center">
      <div className="max-w-md mx-auto w-full px-4 py-10">
        <div className="flex flex-col items-center justify-center mb-6">
          <img src="/logo-fv.png" alt="Factor Victoria" className="w-20 h-20 md:w-24 md:h-24" />
          <h1 className="mt-3 text-white text-2xl font-bold">Iniciar sesión</h1>
        </div>

        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Correo"
            className="mt-1 w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900"
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
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700"
              aria-label={show ? "Ocultar contraseña" : "Ver contraseña"}
              title={show ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {show ? "🙈" : "👁️"}
            </button>
          </div>

          <div className="mt-2 text-xs text-white/70">¿Olvidaste tu contraseña?</div>

          {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

          <button className="mt-4 w-full px-4 py-3 rounded-2xl bg-[#E6C464] text-slate-900 font-semibold">
            Entrar
          </button>
        </form>

        <div className="mt-4 text-sm text-white/80">
          ¿Aún no tienes cuenta?{" "}
          <a href="/#planes" className="text-[#E6C464] underline">Regístrate</a>
        </div>
      </div>
    </div>
  );
}
