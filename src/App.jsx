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
      price: "$19.990",
      sub: "Mensual",
      bullets: [
        "Guia para principiantes",
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
      price: "$44.990",
      sub: "+1 Mes de Regalo 🎁",
      bullets: [
        "4 meses modo profesional",
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
      price: "$99.990",
      sub: "Anual",
      bullets: [
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
      price: "$249.990",
      sub: "Vitalicio",
      bullets: [
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

  const [stake, setStake] = React.useState("");
  const stakeNum = Number(String(stake || "").replace(/[^\d]/g, "")) || 0;

  const simCards = [
    { label: "Mensual · x10", mult: 10 },
    { label: "Trimestral · x20", mult: 20 },
    { label: "Anual · x50", mult: 50 },
    { label: "Vitalicio · x100", mult: 100 },
  ];

  function formatCLP(n) {
    try {
      return n.toLocaleString("es-CL");
    } catch {
      return String(n);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        {/* Hero */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/40 p-6 md:p-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {/* Logo pequeño en el hero (usa /public/logo-fv.png) */}
              <img
                src="/logo-fv.png"
                alt="Factor Victoria"
                className="h-20 md:h-22 w-auto scale-[1.08]"
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
              Estadísticas, pronósticos y simulador de ganancias para apostar con
              criterio.
            </p>

            {/* Solo “Ver planes” (se eliminó “Ir al comparador”) */}
            <div className="flex flex-wrap gap-2">
              <a
                href="#planes"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ backgroundColor: GOLD, color: "#0f172a" }}
              >
                Ver planes
              </a>
            </div>
          </div>
        </section>

        {/* Planes */}
        <section id="planes" className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-4">
            <h2 className="text-xl md:text-2xl font-bold">Planes</h2>
            <div className="text-xs text-slate-400">
              Los precios son referenciales (modo prueba).
            </div>
          </div>

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
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-bold">{p.tag}</div>
                  {p.badge ? (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-200 border border-yellow-500/30">
                      {p.badge}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                  <div className="text-3xl font-extrabold">{p.price}</div>
                  <div className="text-xs text-slate-400">{p.sub}</div>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400/80" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="mt-5 w-fit px-5 py-2.5 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: GOLD, color: "#0f172a" }}
                  onClick={() => alert("Checkout próximamente (Flow).")}
                >
                  Comprar
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Simulador */}
        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7">
          <h3 className="text-lg md:text-xl font-bold mb-1">
            Simula tus ganancias
          </h3>
          <p className="text-slate-300 text-sm mb-4">
            Ingresa tu monto y calcula cuánto podrías ganar según tu plan.
          </p>

          <input
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            placeholder="Monto a apostar (CLP)"
            className="w-full md:max-w-md rounded-2xl bg-white/10 text-white px-4 py-3 border border-white/10"
          />

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {simCards.map((c) => {
              const win = stakeNum * c.mult;
              return (
                <div
                  key={c.label}
                  className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"
                >
                  <div className="text-sm font-semibold">{c.label}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Apuesta: ${formatCLP(stakeNum)}
                  </div>
                  <div className="text-sm font-bold mt-2 text-emerald-300">
                    Ganancia: ${formatCLP(win)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Imagen + footer (usa /public/hero-players.png) */}
        <section className="mt-10 rounded-3xl border border-white/10 overflow-hidden bg-white/5">
          <div className="p-5 md:p-7">
            <h3 className="text-lg md:text-xl font-bold">
              Convierte información en ventaja
            </h3>
            <p className="text-slate-300 text-sm mt-1">
              Nuestra IA analiza estadísticas, tendencias y señales del mercado
              para detectar cuotas con valor.
            </p>
          </div>

          <div className="h-56 md:h-72 bg-slate-950 overflow-hidden">
            <img
              src="/hero-players.png"
              alt="Factor Victoria"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-4 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Factor Victoria
          </div>
        </section>
      </div>
    </div>
  );
}

/* -------------------- Protected Route -------------------- */
function PrivateRoute({ children }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

/* -------------------- Top Nav -------------------- */
function NavButton({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link
      to={to}
      className={[
        "flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold border transition",
        active
          ? "text-slate-900 border-transparent"
          : "bg-slate-900/40 text-slate-100 border-slate-600/50 hover:bg-slate-800",
      ].join(" ")}
      style={active ? { backgroundColor: GOLD } : undefined}
    >
      {children}
    </Link>
  );
}

function AppInner() {
  const { isLoggedIn, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="text-sm md:text-base font-semibold flex-none">
            Factor <span style={{ color: GOLD }}>Victoria</span>
          </Link>

          {/* Scroll horizontal en móvil */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <NavButton to="/">Inicio</NavButton>
            <NavButton to="/app">Comparador</NavButton>
            <NavButton to="/fixture">Partidos</NavButton>
            {isLoggedIn && <NavButton to="/perfil">Perfil</NavButton>}

            {isLoggedIn ? (
              <button
                type="button"
                onClick={logout}
                className="flex-none ml-1 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold border border-slate-600/60 text-slate-200 bg-slate-900/40 hover:bg-slate-800 transition"
              >
                Cerrar sesión
              </button>
            ) : (
              <NavButton to="/login">Iniciar sesión</NavButton>
            )}
          </div>
        </nav>
      </header>

      <main className="pb-10">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/app"
            element={
              <PrivateRoute>
                <Comparator />
              </PrivateRoute>
            }
          />

          <Route
            path="/fixture"
            element={
              <PrivateRoute>
                <Fixtures />
              </PrivateRoute>
            }
          />

          <Route
            path="/perfil"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          <Route path="/login" element={<Login />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
