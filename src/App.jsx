// src/App.jsx
import React from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";

import Comparator from "./pages/Comparator";
import Fixtures from "./pages/Fixtures";
import Profile from "./pages/Profile";
import { useAuth, AuthProvider } from "./lib/auth";

const GOLD = "#E6C464";

/* ---------- Landing simple (pública) ---------- */
function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="max-w-xl mx-auto text-center px-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Factor <span style={{ color: GOLD }}>Victoria</span>
        </h1>
        <p className="text-slate-300 text-sm md:text-base mb-6">
          Plataforma de análisis y combinadas para apuestas deportivas.
          Inicia sesión con tu cuenta y usa el comparador profesional
          y el módulo de partidos.
        </p>

        <Link
          to="/app"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold"
          style={{ backgroundColor: GOLD, color: "#0f172a" }}
        >
          Entrar al comparador
        </Link>
      </div>
    </div>
  );
}

/* ---------- Ruta protegida ---------- */
function PrivateRoute({ children }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  return children;
}

/* ---------- Botón del menú superior ---------- */
function NavButton({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link
      to={to}
      className={[
        "px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold border transition",
        active
          ? "bg-[var(--gold, #E6C464)] text-slate-900 border-transparent"
          : "bg-slate-900/40 text-slate-100 border-slate-600/50 hover:bg-slate-800",
      ].join(" ")}
      style={active ? { backgroundColor: GOLD } : undefined}
    >
      {children}
    </Link>
  );
}

/* ---------- Layout principal ---------- */
function AppInner() {
  const { isLoggedIn, logout } = useAuth();
  const location = useLocation();

  const inAppArea =
    location.pathname === "/app" ||
    location.pathname === "/fixture" ||
    location.pathname === "/perfil";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Barra superior para el área interna */}
      {isLoggedIn && inAppArea && (
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Link
              to="/app"
              className="text-sm md:text-base font-semibold tracking-tight"
            >
              Factor <span style={{ color: GOLD }}>Victoria</span>
            </Link>

            <div className="flex items-center gap-2">
              <NavButton to="/app">Inicio</NavButton>
              <NavButton to="/fixture">Partidos</NavButton>
              <NavButton to="/perfil">Perfil</NavButton>

              <button
                type="button"
                onClick={logout}
                className="ml-1 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold border border-slate-600/60 text-slate-200 bg-slate-900/40 hover:bg-slate-800 transition"
              >
                Cerrar sesión
              </button>
            </div>
          </nav>
        </header>
      )}

      {/* Contenido de las rutas */}
      <main className="pb-10">
        <Routes>
          {/* Landing / página pública */}
          <Route path="/" element={<Landing />} />

          {/* Comparador */}
          <Route
            path="/app"
            element={
              <PrivateRoute>
                <Comparator />
              </PrivateRoute>
            }
          />

          {/* Partidos */}
          <Route
            path="/fixture"
            element={
              <PrivateRoute>
                <Fixtures />
              </PrivateRoute>
            }
          />

          {/* Perfil */}
          <Route
            path="/perfil"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          {/* Cualquier otra ruta -> a inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

/* ---------- Export raíz envuelta en AuthProvider ---------- */
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
