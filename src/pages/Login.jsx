// src/pages/Login.jsx
import React from "react";

export default function Login() {
  return (
    <div className="bg-slate-900 min-h-[75vh] flex items-center">
      <div className="w-full max-w-md mx-auto px-4 py-10">
        {/* Título + logo centrados */}
        <h1 className="text-white text-3xl font-bold flex items-center justify-center gap-3 mb-8">
          <img
            src="/logo-fv.png"
            alt="Factor Victoria"
            className="w-14 h-14 object-contain"
          />
          <span>Iniciar sesión</span>
        </h1>

        {/* Formulario */}
        <form className="space-y-3">
          <input
            type="email"
            placeholder="Correo"
            className="w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900 placeholder-slate-500"
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900 placeholder-slate-500"
          />

          <div className="text-xs text-white/80">
            ¿Olvidaste tu contraseña?
          </div>

          <button
            type="submit"
            className="mt-2 w-full px-4 py-3 rounded-2xl bg-[#E6C464] text-slate-900 font-semibold hover:opacity-90"
          >
            Entrar
          </button>
        </form>

        <div className="mt-4 text-sm text-white/85">
          ¿Aún no tienes cuenta?{" "}
          <a href="/#planes" className="text-[#E6C464] underline">
            Regístrate
          </a>
        </div>
      </div>
    </div>
  );
}
