// src/pages/Comparator.jsx
import React, { useState } from "react";
import Simulator from "../components/Simulator";

export default function Comparator() {
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [q, setQ] = useState("");

  // TODO: conecta esto a tu sistema real de auth
  const isLoggedIn = false;

  // --- Gate: si NO está logueado, mostramos aviso y salimos ---
  if (!isLoggedIn) {
    return (
      <div className="bg-slate-900 min-h-screen">
        <section className="max-w-6xl mx-auto px-4 py-12 text-white">
          <h1 className="text-2xl font-bold mb-3">Comparador</h1>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            Para generar cuotas, primero{" "}
            <a href="/#planes" className="text-[#E6C464] underline">
              compra una membresía
            </a>{" "}
            e inicia sesión.
          </div>
        </section>
      </div>
    );
  }

  // --- UI principal si hay sesión ---
  return (
    <div className="bg-slate-900 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-8 text-white">
        {/* Filtros: fecha + búsqueda + generar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl px-3 py-2 bg-[#E6C464] text-slate-900"
          />
          <input
            placeholder="Equipo / liga"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 bg-[#E6C464] text-slate-900"
          />
          <button className="rounded-xl px-4 py-2 bg-[#E6C464] text-slate-900 font-semibold">
            Generar
          </button>
        </div>

        {/* Aquí renderizarías las 3 cuotas por partido (mock o datos reales) */}

        {/* Bloques resumen */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            "Cuota segura de regalo 1.5–3 (90–95% acierto)",
            "Cuota generada x10",
            "Probabilidad de acierto (prom.) 90%",
            "Desfase del mercado",
          ].map((t, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="text-white font-semibold">{t}</div>
              <div className="text-white/70 text-sm mt-1">
                Próximamente: resultados basados en tus filtros.
              </div>
            </div>
          ))}
        </div>

        {/* Upsell bloqueado (clickeable) */}
        <div className="mt-8">
          <h3 className="text-white text-xl font-bold mb-3">
            ¿Estás listo para mejorar tus ganancias?
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {["x20", "x50", "x100"].map((id) => (
              <div
                key={id}
                onClick={() => (window.location.href = "/#planes")}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-70 hover:opacity-100 cursor-pointer"
              >
                <div className="text-white font-semibold">
                  Plan {id.toUpperCase()}
                </div>
                <div className="text-sm text-white/70">
                  Contenido bloqueado 🔒 · Toca para mejorar
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulador al final */}
        <div className="mt-10">
          <Simulator />
        </div>
      </section>
    </div>
  );
}
