// src/pages/Login.jsx
import React from "react";

export default function Login() {
  return (
    <div className="min-h-[70vh] bg-slate-900 flex items-center">
      <div className="max-w-md mx-auto w-full px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-2xl font-bold">Iniciar sesión</h1>
          <img src="/logo-fv.png" alt="Factor Victoria" className="w-10 h-10" />
        </div>

        <input
          type="email"
          placeholder="Correo"
          className="mt-6 w-full px-4 py-3 rounded-2xl bg-white text-slate-900"
        />
        <input
          type="password"
          placeholder="Contraseña"
          className="mt-3 w-full px-4 py-3 rounded-2xl bg-white text-slate-900"
        />
        <div className="mt-2 text-xs text-white/70">¿Olvidaste tu contraseña?</div>

        <button className="mt-4 w-full px-4 py-3 rounded-2xl bg-amber-400 text-slate-900 font-semibold">
          Entrar
        </button>

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
