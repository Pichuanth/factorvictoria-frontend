// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Comparator from "./pages/Comparator.jsx";   // 👈 NOMBRE Y RUTA EXACTOS (archivo: src/pages/Comparator.jsx)
import Fixtures from "./pages/Fixtures.jsx";
import Login from "./pages/Login.jsx";

/* ---------- Header (franja blanca + tab activo dorado) ----------- */
function NavItem({ to, children }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={
        "px-4 py-2 text-sm font-semibold transition rounded-full " +
        (active ? "bg-amber-400 text-slate-900" : "bg-slate-800 text-white hover:bg-slate-700")
      }
    >
      {children}
    </Link>
  );
}

function Header() {
  return (
    <header className="bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 items-center">
        {/* sin texto 'Factor Victoria' aquí, solo tabs */}
        <nav className="ml-auto flex gap-2">
          <NavItem to="/">Inicio</NavItem>
          <NavItem to="/app">Comparador</NavItem>
          <NavItem to="/fixture">Partidos</NavItem>
          <NavItem to="/login">Iniciar sesión</NavItem>
        </nav>
      </div>
    </header>
  );
}
/* --------------------------------------------------------------- */

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<Comparator />} />   {/* 👈 usa el mismo nombre del import */}
        <Route path="/fixture" element={<Fixtures />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
