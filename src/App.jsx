// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Comparator from "./pages/Comparator.jsx";
import Fixtures from "./pages/Fixtures.jsx";
import Login from "./pages/Login.jsx";

import { AuthProvider, useAuth } from "./lib/auth";

/* ---------- Tabs del header ---------- */
function NavItem({ to, children }) {
  const { pathname } = useLocation();
  const active = pathname === to;

  const base = "px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-sm font-semibold transition";
  const on   = "bg-[#E6C464] text-slate-900";
  const off  = "bg-slate-800 text-white hover:bg-slate-700";

  return (
    <Link to={to} className={`${base} ${active ? on : off}`}>
      {children}
    </Link>
  );
}

/* ---------- Header ---------- */
function Header() {
  const { isLoggedIn, logout } = useAuth();

  return (
    <header className="bg-[#FFFFF0]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
        <nav className="ml-auto flex items-center gap-2">
          <NavItem to="/">Inicio</NavItem>
          <NavItem to="/app">Comparador</NavItem>
          <NavItem to="/fixture">Partidos</NavItem>

          {!isLoggedIn ? (
            <Link
              to="/login"
              className="text-sm md:text-base font-semibold text-slate-900 hover:underline whitespace-nowrap"
            >
              Iniciar sesión
            </Link>
          ) : (
            <button
              onClick={logout}
              className="text-sm md:text-base font-semibold text-slate-900 underline whitespace-nowrap"
            >
              Cerrar sesión
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ---------- App ---------- */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* CONTENEDOR OSCURO GLOBAL */}
        <div className="min-h-screen bg-[#0b1220] text-slate-100 antialiased">
          <Header />
          <main className="min-h-[calc(100vh-64px)]">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/app" element={<Comparator />} />
              <Route path="/fixture" element={<Fixtures />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
