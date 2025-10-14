// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Comparator from "./pages/Comparator.jsx"; // <-- nombre y ruta exactos
import Fixtures from "./pages/Fixtures.jsx";
import Login from "./pages/Login.jsx";

/* -------- Nav pill activo dorado + franja mármol -------- */
function NavItem({ to, children }) {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Link
      to={to}
      className={
        "px-4 py-2 text-sm font-semibold rounded-full transition " +
        (active
          ? "bg-[#E6C464] text-slate-900 ring-1 ring-[#E6C464]"
          : "bg-slate-800 text-white hover:bg-slate-700")
      }
    >
      {children}
    </Link>
  );
}

function Header() {
  return (
    <header className="bg-[#FFFFF0]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 items-center">
        {/* sin texto “Factor Victoria” aquí */}
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
/* -------------------------------------------------------- */

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<Comparator />} />
        <Route path="/fixture" element={<Fixtures />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
