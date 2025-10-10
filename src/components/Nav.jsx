// src/components/Nav.jsx
import { NavLink, Link } from "react-router-dom";
import { brand } from "../copy";

const Chip = ({ to, children }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      [
        "px-5 py-2 rounded-full text-sm font-semibold transition",
        isActive
          ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 shadow"
          : "text-white/90 hover:text-white hover:bg-white/10",
      ].join(" ")
    }
  >
    {children}
  </NavLink>
);

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b border-white/10 bg-slate-950/60">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo-fv.png" alt="logo" className="h-6 w-6" />
          <span className="text-white font-semibold">{brand.name}</span>
        </Link>

        <div className="flex-1" />

        <div className="flex gap-2">
          <Chip to="/">Inicio</Chip>
          <Chip to="/app">Comparador</Chip>
          <Chip to="/fixture">Partidos</Chip>
          <Chip to="/login">Iniciar sesión</Chip>
        </div>
      </nav>
    </header>
  );
}
