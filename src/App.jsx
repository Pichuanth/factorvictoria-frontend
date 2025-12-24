// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import Comparator from "./pages/Comparator";
import Fixtures from "./pages/Fixtures";
import Profile from "./pages/Profile";
import { useAuth } from "./lib/auth";

const GOLD = "#E6C464";

/* -------------------- Landing (Inicio) -------------------- */
function Home() {
  const plans = [
    {
      tag: "Mensual",
      planName: "Plan Inicio",
      price: "$19.990",
      sub: "Mensual",
      bullets: [
        "Guía para principiantes",
        "Picks análisis básicos diarios",
        "Simulador de ganancias incluido",
        "Cuotas x1.5 de regalo",
        "Cuotas potenciadas x10",
        "100 cupos disponibles",
      ],
    },
    {
      tag: "Trimestral",
      planName: "Plan Goleador",
      price: "$44.990",
      sub: "+1 Mes de Regalo 🎁",
      bullets: [
        "4 meses modo Profesional",
        "Guía de estrategia y gestión de banca",
        "1 Estrategia VIP incluida",
        "Cuotas x1.5 a x3 de regalo",
        "Cuotas potenciadas x20",
        "50 cupos disponibles",
      ],
    },
    {
      tag: "Anual",
      planName: "Plan Campeón",
      price: "$99.990",
      sub: "Anual",
      badge: "Más popular",
      bullets: [
        "Guía de estrategia PRO",
        "2 Estrategias VIP incluidas",
        "Cuotas x1.5 a x3 de regalo",
        "Cuotas potenciadas x50",
      ],
      highlight: true,
    },
    {
      tag: "Vitalicio",
      planName: "Plan Leyenda",
      price: "$249.990",
      sub: "Vitalicio",
      bullets: [
        "Acceso total de por vida",
        "3 Estrategias VIP",
        "Cuotas x1.5 a x3 de regalo",
        "Cuotas potenciadas x100",
        "Solo 20 cupos",
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-4xl font-extrabold mb-4">
          Convierte información en <span style={{ color: GOLD }}>ventaja</span>
        </h1>
        <p className="text-slate-300 mb-6">
          Estadísticas y combinadas inteligentes para apostar con criterio.
        </p>
        <a
          href="#planes"
          className="px-5 py-2.5 rounded-full font-semibold"
          style={{ backgroundColor: GOLD, color: "#0f172a" }}
        >
          Ver planes
        </a>
      </section>

      <section id="planes" className="mt-10">
        <h2 className="text-2xl font-bold mb-6">Planes</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((p) => (
            <div
              key={p.tag}
              className={[
                "rounded-3xl border bg-white/5 p-6",
                p.highlight
                  ? "border-yellow-500/60 shadow-[0_0_0_2px_rgba(230,196,100,0.25)]"
                  : "border-white/10",
              ].join(" ")}
            >
              <div className="flex justify-between items-center">
                <div className="font-bold text-lg">
                  {p.tag}{" "}
                  <span style={{ color: GOLD }}>{p.planName}</span>
                </div>
                {p.badge && (
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-200">
                    {p.badge}
                  </span>
                )}
              </div>

              <div className="mt-2 text-3xl font-extrabold">{p.price}</div>
              <div className="text-xs text-slate-400">{p.sub}</div>

              <ul className="mt-4 space-y-2 text-sm">
                {p.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="w-1.5 h-1.5 mt-1 rounded-full bg-yellow-400" />
                    {b}
                  </li>
                ))}
              </ul>

              <button
                className="mt-5 px-5 py-2 rounded-full font-semibold"
                style={{ backgroundColor: GOLD, color: "#0f172a" }}
              >
                Comprar
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* -------------------- Auth Guard -------------------- */
function PrivateRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

/* -------------------- Nav Button -------------------- */
function NavButton({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link
      to={to}
      className={[
        "px-4 py-2 rounded-full text-sm font-semibold border transition",
        active
          ? "text-slate-900"
          : "text-slate-200 border-slate-600/50 hover:bg-slate-800",
      ].join(" ")}
      style={active ? { backgroundColor: GOLD } : undefined}
    >
      {children}
    </Link>
  );
}

/* -------------------- App -------------------- */
function AppInner() {
  const { isLoggedIn, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <nav className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="font-bold">
            Factor <span style={{ color: GOLD }}>Victoria</span>
          </Link>

          <div className="flex gap-2">
            <NavButton to="/">Inicio</NavButton>
            <NavButton to="/app">Comparador</NavButton>
            <NavButton to="/fixture">Partidos</NavButton>
            {isLoggedIn && <NavButton to="/perfil">Perfil</NavButton>}

            {isLoggedIn ? (
              <button
                onClick={logout}
                className="px-4 py-2 rounded-full text-sm border border-slate-600 hover:bg-slate-800"
              >
                Salir
              </button>
            ) : (
              <NavButton to="/login">Ingresar</NavButton>
            )}
          </div>
        </nav>
      </header>

      {/* ROUTES */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<PrivateRoute><Comparator /></PrivateRoute>} />
        <Route path="/fixture" element={<PrivateRoute><Fixtures /></PrivateRoute>} />
        <Route path="/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
