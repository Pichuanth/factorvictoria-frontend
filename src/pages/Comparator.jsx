// src/pages/Comparator.jsx
import React, { useState } from "react";
import Simulator from "../components/Simulator";
import { useAuth, PLAN_RANK } from "../lib/auth";
import { SECTION_TITLES, PLAN_MULTIPLIER } from "../lib/prompt";

export default function Comparator() {
  const { isLoggedIn, user } = useAuth();
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [q, setQ] = useState("");

  // Fondo y envoltorio común (siempre azul marino)
  const Wrapper = ({ children }) => (
    <div className="bg-slate-900 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-8 text-white">
        {children}
      </section>
    </div>
  );

  // Vista bloqueada (no logged-in)
  if (!isLoggedIn) {
    return (
      <Wrapper>
        <h1 className="text-2xl font-bold mb-3">Comparador</h1>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          Para generar cuotas, primero{" "}
          <a href="/#planes" className="text-[#E6C464] underline">
            compra una membresía
          </a>{" "}
          e inicia sesión.
        </div>
      </Wrapper>
    );
  }

  // Usuario logueado: calculamos su plan y multiplicador
  const rank = user?.rank ?? PLAN_RANK.basic; // 0,10,50,100…
  const mult = PLAN_MULTIPLIER[rank] ?? 10;

  // Etiqueta de la tarjeta xPlan con el multiplicador correcto
  const xPlanTitle = `${SECTION_TITLES.xPlan} x${mult}`;

  // Upsell: mostrar bloqueados solo si no es Vitalicio
  const showUpsell = rank < PLAN_RANK.vitalicio;
  const lockedPlans =
    rank === PLAN_RANK.basic
      ? ["x20", "x50", "x100"]
      : rank === PLAN_RANK.trimestral
      ? ["x50", "x100"]
      : rank === PLAN_RANK.anual
      ? ["x100"]
      : [];

  return (
    <Wrapper>
      {/* Barra: fecha + búsqueda + generar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl px-3 py-2 bg-[#FFFFF0] text-slate-900"
        />
        <input
          placeholder="Equipo / liga"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 rounded-xl px-3 py-2 bg-[#FFFFF0] text-slate-900"
        />
        <button className="rounded-xl px-4 py-2 bg-[#E6C464] text-slate-900 font-semibold">
          Generar
        </button>
      </div>

      {/* Secciones (4) */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Regalo */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-white font-semibold">
            {SECTION_TITLES.regalo}
          </div>
          <div className="text-white/70 text-sm mt-1">
            Próximamente: resultados basados en tus filtros.
          </div>
        </div>

        {/* xPlan con multiplicador correcto */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-white font-semibold">{xPlanTitle}</div>
          <div className="text-white/70 text-sm mt-1">
            Tu plan: {user?.planLabel?.toUpperCase() || "—"}
          </div>
        </div>

        {/* Árbitros más tarjeteros (reemplaza Probabilidad…) */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-white font-semibold">
            {SECTION_TITLES.arbitros}
          </div>
          <div className="text-white/70 text-sm mt-1">Próximamente.</div>
        </div>

        {/* Desfase del mercado */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-white font-semibold">
            {SECTION_TITLES.desfase}
          </div>
          <div className="text-white/70 text-sm mt-1">
            Incluido en todas las membresías.
          </div>
        </div>
      </div>

      {/* Upsell bloqueado (no mostrar en Vitalicio) */}
      {showUpsell && (
        <div className="mt-8">
          <h3 className="text-white text-xl font-bold mb-3">
            ¿Estás listo para mejorar tus ganancias?
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {lockedPlans.map((id) => (
              <div
                key={id}
                onClick={() => (window.location.href = "/#planes")}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-70 hover:opacity-100 cursor-pointer"
                title="Mejorar plan"
              >
                <div className="text-white font-semibold">Plan {id}</div>
                <div className="text-sm text-white/70">Contenido bloqueado 🔒</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulador al final */}
      <div className="mt-10">
        <Simulator />
      </div>
    </Wrapper>
  );
}
