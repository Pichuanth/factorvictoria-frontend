// src/components/Header.jsx
import { NavLink } from "react-router-dom";

export default function Header() {
  const base =
    "inline-flex items-center px-5 py-2 rounded-xl transition font-semibold";
  const active =
    "bg-amber-400 text-slate-900 shadow";
  const idle =
    "bg-slate-900/10 text-slate-800 hover:bg-slate-900/20";

  return (
    <header className="w-full bg-white border-b border-slate-200">
      <nav className="max-w-6xl mx-auto px-4 h-[64px] flex items-center gap-3">
        <div className="mr-2 text-slate-900 font-bold">
          Factor <span className="text-slate-700">Victoria</span>
        </div>

        <div className="flex gap-3">
          <NavLink
            to="/"
            className={({ isActive }) => `${base} ${isActive ? active : idle}`}
          >
            Inicio
          </NavLink>
          <NavLink
            to="/app"
            className={({ isActive }) => `${base} ${isActive ? active : idle}`}
          >
            Comparador
          </NavLink>
          <NavLink
            to="/fixture"
            className={({ isActive }) => `${base} ${isActive ? active : idle}`}
          >
            Partidos
          </NavLink>
          <NavLink
            to="/login"
            className={({ isActive }) => `${base} ${isActive ? active : idle}`}
          >
            Iniciar sesión
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
