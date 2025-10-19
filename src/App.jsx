// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Comparator from "./pages/Comparator.jsx";
import Fixtures from "./pages/Fixtures.jsx";
import Login from "./pages/Login.jsx";

import { AuthProvider, useAuth } from "./lib/auth";

/* ---------- Header (mármol + tabs) ----------- */
function NavItem({ to, children }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  const base = "px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-sm font-semibold transition text-slate-900";
  const on = "bg-[#E6C464]";
  const off = "bg-slate-800 text-white hover:bg-slate-700";
  return <Link to={to} className={`${base} ${active ? on : off}`}>{children}</Link>;
}

function Header() {
  const { isLoggedIn, user, logout } = useAuth();

  return (
    <header className="bg-[#FFFFF0]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
        <nav className="ml-auto flex items-center gap-2">
          <NavItem to="/">Inicio</NavItem>
          <NavItem to="/app">Comparador</NavItem>
          <NavItem to="/fixture">Partidos</NavItem>

          {!isLoggedIn ? (
            <Link to="/login" className="text-sm md:text-base font-semibold text-slate-900 hover:underline whitespace-nowrap">
              Iniciar sesión
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700 hidden sm:inline">
                {user?.plan?.toUpperCase()}
              </span>
              <button
                onClick={logout}
                className="text-sm md:text-base font-semibold text-slate-900 hover:underline"
              >
                Salir
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
/* --------------------------------------------------------------- */

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app" element={<Comparator />} />
          <Route path="/fixture" element={<Fixtures />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
