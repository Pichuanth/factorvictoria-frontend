// src/pages/Login.jsx
import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    setErr("");
    const ok = login(email, pass);
    if (!ok) {
      setErr("Correo o contraseña inválidos.");
      return;
    }
    // éxito → ir directo al comparador
    navigate("/app");
  };

  return (
    <div className="min-h-[70vh] bg-slate-900 flex items-center">
      <div className="max-w-md mx-auto w-full px-4 py-10">
        {/* Logo centrado grande */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo-fv.png"
            alt="Factor Victoria"
            className="h-22 md:h-24 w-auto scale-[1.18]"
          />
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

          {/* Contraseña + botón ojo */}
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
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              title={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {show ? (
                // ojo abierto
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                // ojo tachado
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-5.94" />
                  <path d="M1 1l22 22" />
                  <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88" />
                  <path d="M12 5c7 0 11 7 11 7a21.9 21.9 0 0 1-3.17 4.5" />
                </svg>
              )}
            </button>
          </div>

          <div className="mt-2 text-xs text-white/70">¿Olvidaste tu contraseña?</div>

          {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

          <button
            className="mt-4 w-full px-4 py-3 rounded-2xl bg-[#E6C464] text-slate-900 font-semibold hover:opacity-90"
          >
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
