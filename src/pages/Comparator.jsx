// src/pages/Comparator.jsx
import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import Simulator from "../components/Simulator";

// multiplicador por plan
const MULT_BY_RANK = {
  basic: 10,         // $19.990
  trimestral: 20,    // $44.990
  anual: 50,         // $99.990
  vitalicio: 100,    // $249.990
};

export default function Comparator() {
  const { isLoggedIn, getUser } = useAuth();
  const user = getUser();
  const rank = user?.rank || "basic";
  const mult = MULT_BY_RANK[rank] ?? 10;

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");

  // gating de secciones premium
  const hasPro = rank === "anual" || rank === "vitalicio";

  // NOTA: dejé el mismo fondo azul marino de todo el sitio
  return (
    <div className="bg-slate-900 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-8 text-white">
        {/* Barra: fecha + búsqueda + generar */}
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

        {/* Si no está logueado → bloqueo con upsell */}
        {!isLoggedIn && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            Para generar cuotas, primero{" "}
            <a href="/#planes" className="text-[#E6C464] underline">
              compra una membresía
            </a>{" "}
            e inicia sesión.
          </div>
        )}

        {/* Bloques (si está logueado mostramos todo lo que corresponda) */}
        {isLoggedIn && (
          <>
            {/* 1. Regalo */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-white font-semibold">
                  Cuota segura (regalo) 1.5–3 · 90–95% acierto
                </div>
                <div className="text-white/70 text-sm mt-1">
                  Próximamente: resultados basados en tus filtros.
                </div>
              </div>

              {/* 2. Cuota generada según plan */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-white font-semibold">
                  Cuota generada x{mult}
                </div>
                <div className="text-white/70 text-sm mt-1">
                  Tu plan: {rank.toUpperCase()}
                </div>
              </div>

              {/* 3. Árbitros más tarjeteros (solo Anual/Vitalicio) */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-white font-semibold">
                  Árbitros más tarjeteros
                </div>
                <div className="text-white/70 text-sm mt-1">
                  {hasPro ? "Próximamente: lista priorizada por tendencia." : "Bloqueado 🔒 Mejora tu plan para acceder."}
                </div>
              </div>

              {/* 4. Cuota desfase del mercado (solo Anual/Vitalicio) */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-white font-semibold">Cuota desfase del mercado</div>
                <div className="text-white/70 text-sm mt-1">
                  {hasPro ? "Próximamente: picks con valor relativo vs mercado." : "Bloqueado 🔒 Mejora tu plan para acceder."}
                </div>
              </div>
            </div>

            {/* Upsell: si no es Vitalicio mostramos los upgrades rápidos */}
            {rank !== "vitalicio" && (
              <div className="mt-8">
                <h3 className="text-white text-xl font-bold mb-3">
                  ¿Estás listo para mejorar tus ganancias?
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* x20 */}
                  {rank === "basic" && (
                    <a
                      href="/#plan-trimestral"
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 cursor-pointer hover:bg-white/10"
                    >
                      <div className="text-white font-semibold">Plan x20</div>
                      <div className="text-sm text-white/70">Mejorar a Trimestral</div>
                    </a>
                  )}
                  {/* x50 */}
                  {(rank === "basic" || rank === "trimestral") && (
                    <a
                      href="/#plan-anual"
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 cursor-pointer hover:bg-white/10"
                    >
                      <div className="text-white font-semibold">Plan x50</div>
                      <div className="text-sm text-white/70">Mejorar a Anual</div>
                    </a>
                  )}
                  {/* x100 */}
                  {(rank === "basic" || rank === "trimestral" || rank === "anual") && (
                    <a
                      href="/#plan-vitalicio"
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 cursor-pointer hover:bg-white/10"
                    >
                      <div className="text-white font-semibold">Plan x100</div>
                      <div className="text-sm text-white/70">Mejorar a Vitalicio</div>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Simulador al final */}
            <div className="mt-10">
              <Simulator />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
