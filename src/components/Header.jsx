import React from "react";
import { NavLink } from "react-router-dom";

export default function Header() {
  const pill =
    "px-4 py-2 rounded-xl bg-slate-800 text-white/90 hover:opacity-90";
  const active =
    "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-semibold";

  return (
    <header className="bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo-fv.png" alt="Factor Victoria" className="w-7 h-7" />
          <span className="font-semibold text-slate-900">Factor Victoria</span>
        </div>

        <nav className="flex gap-3">
          <NavLink to="/" end className={({isActive}) => `${pill} ${isActive ? active : ""}`}>Inicio</NavLink>
          <NavLink to="/app" className={({isActive}) => `${pill} ${isActive ? active : ""}`}>Comparador</NavLink>
          <NavLink to="/fixture" className={({isActive}) => `${pill} ${isActive ? active : ""}`}>Partidos</NavLink>
          <NavLink to="/login" className={({isActive}) => `${pill} ${isActive ? active : ""}`}>Iniciar sesión</NavLink>
        </nav>
      </div>
    </header>
  );
}
