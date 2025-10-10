import { NavLink } from "react-router-dom";

export default function Header() {
  const base =
    "px-4 py-2 rounded-xl text-sm md:text-base font-semibold transition";
  const active =
    "bg-amber-300 text-slate-900 shadow-sm";      // dorado activo
  const idle =
    "text-slate-900 hover:bg-slate-100";          // blanco/inactivo

  return (
    <header className="sticky top-0 z-40 bg-white/95 border-b border-slate-200 backdrop-blur">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
        <ul className="flex items-center gap-2">
          <li>
            <NavLink to="/" className={({isActive}) => `${base} ${isActive ? active : idle}`}>
              Inicio
            </NavLink>
          </li>
          <li>
            <NavLink to="/app" className={({isActive}) => `${base} ${isActive ? active : idle}`}>
              Comparador
            </NavLink>
          </li>
          <li>
            <NavLink to="/fixture" className={({isActive}) => `${base} ${isActive ? active : idle}`}>
              Partidos
            </NavLink>
          </li>
          <li className="ml-2">
            <NavLink to="/login" className={({isActive}) => `${base} ${isActive ? active : idle}`}>
              Iniciar sesión
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  );
}
