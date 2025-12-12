// src/pages/Landing.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

const GOLD = "#E6C464";

function formatCLP(value) {
  if (!Number.isFinite(value)) return "$0";
  return value.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

export default function Landing() {
  const [amount, setAmount] = useState("");

  const base = parseInt(amount.replace(/\D/g, ""), 10) || 0;

  const plansSim = [
    { id: "mensual", label: "Mensual", multiplier: 10 },
    { id: "trimestral", label: "Trimestral", multiplier: 20 },
    { id: "anual", label: "Anual", multiplier: 50 },
    { id: "vitalicio", label: "Vitalicio", multiplier: 100 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Barra superior */}
      <header className="sticky top-0 z-20 bg-slate-950/95 border-b border-white/5 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-lg">
              Factor <span style={{ color: GOLD }}>Victoria</span>
            </span>
          </div>

          <nav className="flex items-center gap-2 text-xs md:text-sm">
            <a
              href="#planes"
              className="px-3 py-1.5 rounded-full bg-slate-900/60 text-slate-100 border border-slate-700/70 hover:bg-slate-800 transition"
            >
              Ver planes
            </a>
            <Link
              to="/app"
              className="px-4 py-1.5 rounded-full font-semibold"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
            >
              Comparador
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-16">
        {/* HERO PRINCIPAL */}
        <section className="pt-10 md:pt-16 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <p className="inline-flex items-center text-[11px] md:text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-200 border border-amber-400/40 mb-4">
              Paga con Flow o Mercado Pago · hasta 6 cuotas*
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4">
              Convierte información en{" "}
              <span style={{ color: GOLD }}>ventaja</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base mb-6 max-w-xl">
              Estadísticas, pronósticos y simulador de ganancias para apostar
              con criterio. Diseñado para creadores de contenido, tipsters y
              apostadores serios que quieren sistematizar sus decisiones.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <a
                href="#planes"
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ backgroundColor: GOLD, color: "#0f172a" }}
              >
                Ver planes
              </a>
              <Link
                to="/app"
                className="px-5 py-2.5 rounded-full text-sm font-semibold border border-slate-600/70 text-slate-100 bg-slate-900/60 hover:bg-slate-800 transition"
              >
                Ir al comparador
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Sin permanencia obligatoria · Puedes cancelar cuando quieras.
            </p>
          </div>

          {/* Aquí simplemente dejamos un bloque de imagen de fondo (la imagen real está en el HTML estático de Vercel) */}
          <div className="hidden md:block">
            <div className="w-full aspect-[4/3] rounded-3xl bg-slate-900/80 border border-slate-700/60 overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex items-center justify-center text-slate-500 text-sm">
              Imagen principal (jugadores con notebook)
            </div>
          </div>
        </section>

        {/* SIMULADOR DE GANANCIAS */}
        <section className="mt-12 md:mt-16" id="simulador">
          <div className="rounded-3xl bg-slate-900/80 border border-slate-700/80 p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-1">
              Simula tus ganancias
            </h2>
            <p className="text-slate-300 text-sm mb-4">
              Ingresa tu monto y calcula cuánto podrías ganar según tu plan.
            </p>

            <div className="max-w-md mb-4">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Monto a apostar (CLP)"
                className="w-full rounded-xl bg-slate-950/70 border border-slate-700/70 text-sm px-3 py-2 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {plansSim.map((p) => {
                const win = base * p.multiplier;
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl bg-slate-950/80 border border-slate-700/70 px-3 py-3 text-sm"
                  >
                    <p className="font-semibold mb-1">
                      {p.label} · x{p.multiplier}
                    </p>
                    <p className="text-xs text-slate-400">
                      Apuesta: {formatCLP(base)}
                    </p>
                    <p className="text-xs text-emerald-400 font-semibold mt-1">
                      Ganancia: {formatCLP(win)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PLANES / PRECIOS */}
        <section className="mt-16 md:mt-20" id="planes">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Planes</h2>
          <p className="text-slate-300 text-sm md:text-base mb-6">
            Elige la membresía que mejor se adapte a tu banca y a tu estilo de
            apuesta. Todos los planes incluyen acceso al comparador y módulo de
            partidos.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {/* Mensual */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-700/80 p-5 flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Mensual</h3>
              <p className="text-3xl font-extrabold mb-1">
                $19.990{" "}
                <span className="text-sm font-semibold text-slate-300">
                  Mensual
                </span>
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-200 flex-1">
                <li>• Ebook para principiantes.</li>
                <li>• Picks análisis básicos diarios.</li>
                <li>• Simulador de ganancias incluido.</li>
                <li>• Cuotas x1.5 de regalo.</li>
                <li>• Cuotas potenciadas x10.</li>
                <li>• 100 cupos disponibles.</li>
              </ul>
              <button
                type="button"
                className="mt-4 inline-flex justify-center px-4 py-2 rounded-full text-sm font-semibold"
                style={{ backgroundColor: GOLD, color: "#0f172a" }}
              >
                Comprar
              </button>
            </div>

            {/* Trimestral */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-700/80 p-5 flex flex-col">
              <h3 className="text-lg font-semibold mb-1">Trimestral</h3>
              <p className="text-xs text-amber-300 mb-1">+1 mes de regalo 🎁</p>
              <p className="text-3xl font-extrabold mb-1">
                $44.990{" "}
                <span className="text-sm font-semibold text-slate-300">
                  Trimestral
                </span>
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-200 flex-1">
                <li>• Guía de estrategia y gestión de banca.</li>
                <li>• 1 Estrategia VIP incluida.</li>
                <li>• Cuotas x1.5 a x3 de regalo.</li>
                <li>• Picks análisis ampliados.</li>
                <li>• Simulador de ganancias incluido.</li>
                <li>• Alertas claves de partidos.</li>
                <li>• Cuotas potenciadas x20.</li>
                <li>• 50 cupos disponibles.</li>
              </ul>
              <button
                type="button"
                className="mt-4 inline-flex justify-center px-4 py-2 rounded-full text-sm font-semibold"
                style={{ backgroundColor: GOLD, color: "#0f172a" }}
              >
                Comprar
              </button>
            </div>

            {/* Anual (más popular) */}
            <div className="rounded-3xl bg-slate-900/80 border-2 border-amber-400 p-5 relative flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] bg-amber-400 text-slate-950 font-semibold shadow">
                Más popular
              </div>
              <h3 className="text-lg font-semibold mb-2 mt-1">Anual</h3>
              <p className="text-3xl font-extrabold mb-1">
                $99.990{" "}
                <span className="text-sm font-semibold text-slate-300">
                  Anual
                </span>
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-200 flex-1">
                <li>• Guía de estrategia PRO.</li>
                <li>• 2 Estrategias VIP incluidas.</li>
                <li>• Cuotas x1.5 a x3 de regalo.</li>
                <li>• Cuota corrección del mercado.</li>
                <li>• Picks análisis ampliados.</li>
                <li>• Simulador de ganancias incluido.</li>
                <li>• Alertas claves de partidos.</li>
                <li>• Cuotas potenciadas x50.</li>
                <li>• 50 cupos disponibles.</li>
              </ul>
              <button
                type="button"
                className="mt-4 inline-flex justify-center px-4 py-2 rounded-full text-sm font-semibold"
                style={{ backgroundColor: GOLD, color: "#0f172a" }}
              >
                Comprar
              </button>
            </div>

            {/* Vitalicio */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-700/80 p-5 flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Vitalicio</h3>
              <p className="text-3xl font-extrabold mb-1">
                $249.990{" "}
                <span className="text-sm font-semibold text-slate-300">
                  Vitalicio
                </span>
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-200 flex-1">
                <li>• Guía de estrategia PRO.</li>
                <li>• Alertas claves de partidos al correo.</li>
                <li>• 2 Estrategias VIP incluidas.</li>
                <li>• Cuotas x1.5 a x3 de regalo.</li>
                <li>• Corrección del mercado VIP.</li>
                <li>• Picks análisis PRO.</li>
                <li>• Simulador de ganancias incluido.</li>
                <li>• Informe mensual personalizado.</li>
                <li>• Cuotas potenciadas x100.</li>
                <li>• Solo 20 cupos disponibles.</li>
              </ul>
              <button
                type="button"
                className="mt-4 inline-flex justify-center px-4 py-2 rounded-full text-sm font-semibold"
                style={{ backgroundColor: GOLD, color: "#0f172a" }}
              >
                Comprar
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER SIMPLE */}
        <footer className="mt-16 border-t border-slate-800 pt-4 pb-2 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Factor Victoria. Todos los derechos
          reservados.
        </footer>
      </main>
    </div>
  );
}
