// src/pages/Comparator.jsx
import React, { useState } from "react";
import Simulator from "../components/Simulator";
import { useAuth, PLAN_RANK } from "../lib/auth";

export default function Comparator() {
  const { isLoggedIn, plan, rank } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");

  // colores suaves
  const gold = "#E6C464";

  // gating por plan (ajusta a tu negocio)
  const canGift = rank >= PLAN_RANK.basic;        // cuota regalo 1.5–3
  const canX10  = rank >= PLAN_RANK.trimestral;   // x10 visible
  const canX50  = rank >= PLAN_RANK.anual;        // x50 visible
  const canX100 = rank >= PLAN_RANK.vitalicio;    // x100 visible
  const canMarket = rank >= PLAN_RANK.basic;      // desfase mercado

  return (
    <div className="bg-slate-900 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-8 text-white">
        {/* Barra: fecha + búsqueda + generar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl px-3 py-2 bg-[#FFFFF0] text-slate-900"
          />
          <input
            placeholder="Equipo / liga / país"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 bg-[#FFFFF0] text-slate-900"
          />
          <button className="rounded-xl px-4 py-2" style={{ background: gold, color: "#0f172a", fontWeight: 600 }}>
            Generar
          </button>
        </div>

        {/* Si NO está logueado */}
        {!isLoggedIn && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-8">
            Para generar cuotas, primero{" "}
            <a href="/#planes" className="underline" style={{ color: gold }}>
              compra una membresía
            </a>{" "}
            e inicia sesión.
          </div>
        )}

        {/* Bloques resumen (según plan) */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Regalo 1.5–3 */}
          <Block title="Cuota segura (regalo) 1.5–3" enabled={isLoggedIn && canGift} gold={gold} />
          {/* x10 */}
          <Block title="Cuota generada x10" enabled={isLoggedIn && canX10} gold={gold} />
          {/* Probabilidad prom. */}
          <Block title="Probabilidad de acierto (prom.) 90%" enabled={isLoggedIn} gold={gold} />
          {/* Desfase mercado */}
          <Block title="Desfase del mercado" enabled={isLoggedIn && canMarket} gold={gold} />
          {/* x50 y x100 si quieres mostrar también aquí (opcional) */}
          {isLoggedIn && (
            <>
              <Block title="Cuota generada x50" enabled={canX50} gold={gold} />
              <Block title="Cuota generada x100" enabled={canX100} gold={gold} />
            </>
          )}
        </div>

        {/* Upsell bloqueado clickeable */}
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
                <div className="text-white font-semibold">Plan {id.toUpperCase()}</div>
                <div className="text-sm text-white/70">Mejorar plan 🔒</div>
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

function Block({ title, enabled, gold }) {
  if (enabled) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white font-semibold">{title}</div>
        <div className="text-white/70 text-sm mt-1">
          Próximamente: resultados basados en tus filtros.
        </div>
      </div>
    );
  }
  // bloqueado
  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-60 cursor-pointer"
      onClick={() => (window.location.href = "/#planes")}
    >
      <div className="text-white font-semibold">{title}</div>
      <div className="text-sm" style={{ color: gold }}>
        Contenido bloqueado — Mejora tu plan
      </div>
    </div>
  );
}
