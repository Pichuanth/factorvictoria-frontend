// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import Comparator from "./pages/Comparator";
import Fixtures from "./pages/Fixtures";
import Profile from "./pages/Profile";
import { useAuth } from "./lib/auth";
import FixtureDetail from "./pages/FixtureDetail";
import GiftsCarousel from "./components/GiftsCarousel";

// si ya tienes asset() en Home.jsx, usa ese. Si no, agrega:
const asset = (p) => `${import.meta.env.BASE_URL}${p.startsWith("/") ? p.slice(1) : p}`;

const IMG_MEDALLA = asset("hero-medalla.jpeg");
const IMG_BOTA = asset("hero-botagoleador.jpeg");
const IMG_TROFEO = asset("hero-trofeo.jpeg");
const BG_USUARIOS_INICIO = asset("hero-usuarios-inicio.png");

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
        "Medalla Conmemorativa Oficial",
        "Guía de estrategia y gestión de banca",
        "1 Estrategia VIP incluida",
        "Cuotas x1.5 a x3 de regalo",
        "Picks análisis ampliados",
        "Simulador de ganancias incluido",
        "Alertas claves de partidos",
        "Cuotas potenciadas x20",
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
        "Copa Leyenda Edición elite",
        "Trofeo profesional Factor Victoria",
        "Medalla conmemorativa oficial",
        "Guía de estrategia PRO",
        "Alertas claves de partidos al correo",
        "3 Estrategias VIP incluidas",
        "Cuotas x1.5 a x3 de regalo",
        "Corrección del mercado VIP",
        "Picks análisis PRO",
        "Simulador de ganancias incluido",
        "Informe mensual personalizado",
        "Cuotas potenciadas x100",
      ],
      highlight: false,
    },
  ];

  const [currency, setCurrency] = React.useState("CLP");
  const [stake, setStake] = React.useState("");

  const stakeNum = Number(String(stake || "").replace(/[^\d]/g, "")) || 0;

  const CURRENCIES = [
    { code: "CLP", label: "Chile (CLP)", locale: "es-CL", symbol: "$" },
    { code: "USD", label: "USA (USD)", locale: "en-US", symbol: "$" },
    { code: "EUR", label: "España (EUR)", locale: "es-ES", symbol: "€" },
    { code: "COP", label: "Colombia (COP)", locale: "es-CO", symbol: "$" },
    { code: "PEN", label: "Perú (PEN)", locale: "es-PE", symbol: "S/" },
  ];

  function fmtMoney(n) {
    const cur = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
    return new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(n);
  }

  function stakeDisplay() {
    const cur = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
    if (!stakeNum) return "";
    return `${cur.symbol}${fmtMoney(stakeNum)}`;
  }

  const simCards = [
    { label: "Mensual • x10", mult: 10 },
    { label: "Trimestral • x20", mult: 20 },
    { label: "Anual • x50", mult: 50 },
    { label: "Vitalicio • x100", mult: 100 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        {/* Hero */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/40 p-6 md:p-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo-fv.png"
                alt="Factor Victoria"
                className="h-20 md:h-22 w-auto scale-[1.30]"
              />
              <div className="text-sm text-slate-300">
                Paga con Flow, Mercado Pago o Stripe • hasta 6 cuotas
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
            <div className="text-xs text-slate-400">Pronto más cupos disponibles.</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => {
              const planId =
                p.tag === "Mensual"
                  ? "plan-mensual"
                  : p.tag === "Trimestral"
                  ? "plan-trimestral"
                  : p.tag === "Anual"
                  ? "plan-anual"
                  : "plan-vitalicio";

              return (
                <div
                  id={planId}
                  key={p.tag}
                  className={[
                    "relative rounded-3xl border bg-white/5 p-5 md:p-6",
                    p.highlight
                      ? "border-yellow-500/60 shadow-[0_0_40px_rgba(234,179,8,0.12)]"
                      : "border-white/10",
                  ].join(" ")}
                >
                  {p.highlight && p.badge ? (
                    <div className="absolute -top-3 right-4 rounded-full bg-yellow-500 px-3 py-1 text-[11px] font-bold text-black shadow">
                      {p.badge}
                    </div>
                  ) : null}

                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold">{p.tag}</div>
                      <span className="inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-semibold text-yellow-200">
                        {p.planName}
                      </span>
                    </div>

                    {!p.highlight && p.badge ? (
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
              );
            })}
          </div>
        </section>
<GiftsCarousel
  title="Regalos por membresía"
  subtitle="Desliza para ver los beneficios físicos incluidos en algunos planes."
  items={[
    { id: "medalla", src: IMG_MEDALLA, title: "Medalla Factor Victoria", note: "Incluida en planes seleccionados." },
    { id: "bota", src: IMG_BOTA, title: "Trofeo Goleador Elite", note: "Beneficio físico según tu membresía." },
    { id: "trofeo", src: IMG_TROFEO, title: "Trofeo Conmemorativo", note: "Edición especial para miembros leyenda." },
  ]}
/>

{/* Confianza / social proof (solo imagen) */}
<section className="mt-10 rounded-3xl border border-white/10 overflow-hidden bg-white/5">
  <div className="h-[220px] sm:h-[260px] md:h-[320px] lg:h-[360px] xl:h-[420px]">
    <img
      src={BG_USUARIOS_INICIO}
      alt="Usuarios activos Factor Victoria"
      className="w-full h-full object-cover object-[50%_28%]"
      loading="lazy"
    />
  </div>
</section>

        {/* Simulador */}
        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7">
          <h3 className="text-lg md:text-xl font-bold mb-1">Simula tus ganancias</h3>
          <p className="text-slate-300 text-sm mb-4">
            Ingresa tu monto y calcula cuánto podrías ganar según tu plan.
          </p>

          <div className="flex flex-col gap-2 md:max-w-md">
            <div className="text-xs text-slate-400">Elige tu moneda local para simular ganancias</div>

            <div className="relative">
              <input
                value={stakeNum ? stakeDisplay() : ""}
                onChange={(e) => {
                  const digits = String(e.target.value || "").replace(/[^\d]/g, "");
                  setStake(digits);
                }}
                inputMode="numeric"
                placeholder="Monto a apostar (elige tu moneda)"
                className="w-full rounded-2xl bg-white/10 text-white px-4 py-3 pr-28 border border-white/10"
              />

              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="relative">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="appearance-none rounded-xl bg-slate-950/50 text-white text-sm px-3 py-2 pr-8 border border-white/10"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>

                  <svg
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M6 8l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.85"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {simCards.map((c) => {
              const win = stakeNum * c.mult;
              const cur = CURRENCIES.find((x) => x.code === currency) || CURRENCIES[0];

              return (
                <div
                  key={c.label}
                  className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"
                >
                  <div className="text-sm font-semibold">{c.label}</div>

                  <div className="text-xs text-slate-400 mt-1">
                    Apuesta: {stakeNum ? `${cur.symbol}${fmtMoney(stakeNum)}` : `${cur.symbol}0`}
                  </div>

                  <div className="text-sm font-bold mt-2 text-emerald-300">
                    Ganancia: {stakeNum ? `${cur.symbol}${fmtMoney(win)}` : `${cur.symbol}0`}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Imagen final */}
        <section className="mt-10 rounded-3xl border border-white/10 overflow-hidden bg-white/5">
          <div className="p-5 md:p-7">
            <h3 className="text-lg md:text-xl font-bold">Convierte información en ventaja</h3>
            <p className="text-slate-300 text-sm mt-1">
              Nuestra IA analiza estadísticas y señales del mercado en tiempo real para detectar cuotas
              con verdadero valor. Deja atrás las decisiones improvisadas y apuesta con datos, planificación
              y visión ganadora.
            </p>
          </div>

          <div className="w-full h-[300px] md:h-[300px] lg:h-[400px] overflow-hidden">
            <img
              src="/hero-players.png"
              alt="Factor Victoria"
              className="w-full h-full object-cover object-[50%_10%]"
              loading="lazy"
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

          {/* ✅ Comparador público: muestra visitor banner + cards si no está logueado */}
          <Route path="/app" element={<Comparator />} />

          <Route path="/fixture" element={<Fixtures />} />
          <Route path="/fixture/:fixtureId" element={<FixtureDetail />} />

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

