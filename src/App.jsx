// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Comparator from "./pages/Comparator.jsx";
import Fixtures from "./pages/Fixtures.jsx";
import Login from "./pages/Login.jsx";

import { AuthProvider, useAuth } from "./lib/auth";

/* ---------- Tabs del navbar ---------- */
function NavItem({ to, children }) {
  const { pathname } = useLocation();
  const active = pathname === to;

  const base = "px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-sm font-semibold transition";
  const on   = "bg-slate-800 text-white hover:bg-slate-700";
  const off  = "text-slate-200 hover:bg-slate-700/50";

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
    <header className="bg-[#0b1220]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
        <NavItem to="/">Inicio</NavItem>
        <NavItem to="/app">Comparador</NavItem>
        <NavItem to="/fixture">Partidos</NavItem>

        <div className="ml-auto">
          {!isLoggedIn ? (
            <Link className="text-slate-300 hover:text-white" to="/login">
              Iniciar sesión
            </Link>
          ) : (
            <button className="text-slate-300 hover:text-white" onClick={logout}>
              Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------- App ---------- */
export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0b1220] text-slate-100 antialiased">
        <BrowserRouter>
          <Header />
          <main className="max-w-6xl mx-auto px-4 pb-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/app" element={<Comparator />} />
              <Route path="/fixture" element={<Fixtures />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </main>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}
