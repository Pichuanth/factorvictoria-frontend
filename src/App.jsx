// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Comparador from "./pages/Comparator.jsx";   // ✅ nombre y ruta EXACTOS
import Fixtures from "./pages/Fixtures.jsx";
import Login from "./pages/Login.jsx";

// Header simple (blanco arriba + pill dorada menos redonda)
function Header() {
  const Item = ({ to, children }) => {
    // pill dorada si está activo por path
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={
          "px-4 py-2 rounded-xl text-sm font-semibold " +
          (active
            ? "bg-amber-400 text-slate-900"
            : "bg-slate-800 text-white hover:bg-slate-700")
        }
      >
        {children}
      </Link>
    );
  };

  return (
    <header className="bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex gap-3 items-center">
        <Link to="/" className="text-slate-900 font-bold">Factor Victoria</Link>
        <nav className="ml-auto flex gap-2">
          <Item to="/">Inicio</Item>
          <Item to="/app">Comparador</Item>
          <Item to="/fixture">Partidos</Item>
          <Item to="/login">Iniciar sesión</Item>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<Comparador />} />
        <Route path="/fixture" element={<Fixtures />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
