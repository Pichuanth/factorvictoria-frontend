// src/pages/Login.jsx
import React from "react";

export default function Login() {
  return (
    <div className="min-h-[70vh] bg-slate-900 flex items-start md:items-center">
      <div className="max-w-md mx-auto w-full px-4 py-10">

        {/* LOGO centrado y grande */}
        <div className="w-full flex justify-center mb-4">
          <img
            src="/logo-fv.png"
            alt="Factor Victoria"
            className="w-28 h-28 md:w-32 md:h-32 object-contain"
          />
        </div>

        {/* Título: “Iniciar sesión” más arriba y alineado a la izquierda */}
        <h1 className="text-white text-3xl font-bold mb-6">
          Iniciar sesión
        </h1>

        {/* Campos */}
        <label className="block">
          <input
            type="email"
            placeholder="Correo"
            className="mt-1 w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900"
          />
        </label>

        <label className="block">
          <input
            type="password"
            placeholder="Contraseña"
            className="mt-3 w-full px-4 py-3 rounded-2xl bg-[#FFFFF0] text-slate-900"
          />
        </label>

        <div className="mt-2 text-xs text-white/70">
          ¿Olvidaste tu contraseña?
        </div>

        <button className="mt-4 w-full px-4 py-3 rounded-2xl bg-[#E6C464] text-slate-900 font-semibold">
          Entrar
        </button>

        <div className="mt-4 text-sm text-white/80">
          ¿Aún no tienes cuenta?{" "}
          <a href="/#planes" className="text-[#E6C464] underline">
            Regístrate
          </a>
        </div>
      </div>
    </div>
  );
}
