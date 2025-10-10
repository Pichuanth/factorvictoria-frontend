import { NavLink } from "react-router-dom";

export default function Header() {
  const base =
    "px-4 py-2 text-sm md:text-base font-medium transition";
  const active =
    "bg-amber-300 text-slate-900 rounded-xl shadow";
  const inactive =
    "text-slate-700 hover:text-slate-900";

  return (
    <header className="w-full bg-white border-b border-slate-200">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
        <NavLink
          to="/"
          className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
        >
          Inicio
        </NavLink>
        <NavLink
          to="/app"
          className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
        >
          Comparador
        </NavLink>
        <NavLink
          to="/fixture"
          className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
        >
          Partidos
        </NavLink>
        <NavLink
          to="/login"
          className={({ isActive }) => `${base} ${isActive ? active : inactive} ml-auto`}
        >
          Iniciar sesión
        </NavLink>
      </nav>
    </header>
  );
}
