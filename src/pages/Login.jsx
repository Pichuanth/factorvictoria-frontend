// src/pages/Login.jsx
import React, { useState } from "react";
import { login } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await login(email, pass);
      nav("/app"); // al comparador
    } catch (e) {
      setErr(e.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="min-h-[70vh] bg-slate-900 flex items-center">
      <div className="max-w-md mx-auto w-full px-4 py-10">
        <h1 className="text-white text-2xl font-bold flex items-center gap-3 mb-6">
          <img src="/logo-fv.png" alt="Factor Victoria" className="w-14 h-14" />
          <span>Iniciar sesión</span>
        </h1>

        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Correo"
            className="mt-2 w-full px-4 py-3 rounded-2xl bg-white text-slate-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <div className="mt-3 relative">
            <input
              type={show ? "text" : "password"}
              placeholder="Contraseña"
              className="w-full px-4 py-3 rounded-2xl bg-white text-slate-900 pr-12"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {show ? "🙈" : "👁️"}
            </button>
          </div>

          {err && <div className="mt-3 text-sm text-rose-400">{err}</div>}

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
