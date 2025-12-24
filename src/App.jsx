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
      highlight: false,
    },
    {
      tag: "Trimestral",
      planName: "Plan Goleador",
      price: "$44.990",
      sub: "+1 Mes de Regalo 🎁",
      bullets: [
        "4 meses modo Profesional",
        "Trofeo Goleador Edición Limitada",
        "Guía de estrategia y gestión de banca",
        "1 Estrategia VIP incluida",
        "Cuotas x1.5 a x3 de regalo",
        "Picks análisis ampliados",
        "Simulador de ganancias incluido",
        "Alertas claves de partidos",
        "Cuotas potenciadas x20",
        "50 cupos disponibles",
      ],
      highlight: false,
    },
    {
      tag: "Anual",
      planName: "Plan Campeón",
      price: "$99.990",
      sub: "Anual",
      bullets: [
        "Trofeo Profesional Factor Victoria",
        "Medalla Conmemorativa Oficial",
        "Guía de estrategia PRO",
        "2 Estrategias VIP incluidas",
        "Cuotas x1.5 a x3 de regalo",
        "Cuota Corrección del mercado",
        "Picks análisis ampliados",
        "Simulador de ganancias incluido",
        "Alertas claves de partidos",
        "Cuotas potenciadas x50",
        "50 cupos disponibles",
      ],
      highlight: true,
      badge: "Más popular",
    },
    {
      tag: "Vitalicio",
      planName: "Plan Leyenda",
      price: "$249.990",
      sub: "Vitalicio",
      bullets: [
        "Copa Leyenda Edición Elite",
        "Trofeo Profesional Factor Victoria",
        "Medalla Oficial Leyenda",
        "Guía de estrategia PRO",
        "Alertas claves de partidos al correo",
        "3 Estrategias VIP incluidas",
        "Cuotas x1.5 a x3 de regalo",
        "Corrección del mercado VIP",
        "Picks análisis PRO",
        "Simulador de ganancias incluido",
        "Informe mensual personalizado",
        "Cuotas potenciadas x100",
        "Solo 20 cupos disponibles",
      ],
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">

        {/* HERO */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/40 p-6 md:p-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo-fv.png"
                alt="Factor Victoria"
                className="h-20 w-auto"
              />
              <div className="text-sm text-slate-300">
                Paga con Flow o Mercado Pago · hasta 6 cuotas
              </div>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              Convierte información
              <br />
              <span className="text-white">en ventaja</span>
            </h1>

            <p className="text-slate-300 max-w-2xl">
              Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.
            </p>

            <a
              href="#planes"
              className="inline-flex w-fit items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
            >
              Ver planes
            </a>
          </div>
        </section>

        {/* PLANES */}
        <section id="planes" className="mt-10">
          <h2 className="text-xl md:text-2xl font-bold mb-4">Planes</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => (
              <div
                key={p.tag}
                className={[
                  "rounded-3xl border bg-white/5 p-5 md:p-6",
                  p.highlight
                    ? "border-yellow-500/60 shadow-[0_0_0_2px_rgba(230,196,100,0.25)]"
                    : "border-white/10",
                ].join(" ")}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-lg font-bold">
                    <span className="text-white">{p.tag}</span>
                    <span style={{ color: GOLD }}>{p.planName}</span>
                  </div>

                  {p.badge && (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-200 border border-yellow-500/30">
                      {p.badge}
                    </span>
                  )}
                </div>

                {/* Precio */}
                <div className="mt-2">
                  <div className="text-2xl md:text-3xl font-extrabold">
                    {p.price}
                  </div>
                  <div className="text-xs text-slate-400">{p.sub}</div>
                </div>

                {/* Bullets */}
                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400/80" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className="mt-5 px-5 py-2.5 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: GOLD, color: "#0f172a" }}
                >
                  Comprar
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* -------------------- Protected Route -------------------- */
function PrivateRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function AppInner() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<PrivateRoute><Comparator /></PrivateRoute>} />
      <Route path="/fixture" element={<PrivateRoute><Fixtures /></PrivateRoute>} />
      <Route path="/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppInner />;
}
