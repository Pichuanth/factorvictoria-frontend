// src/pages/Comparator.jsx
import React, { useState } from "react";
import Simulator from "../components/Simulator";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";
const IVORY = "#FFFFF0";

const MULT_BY_PLAN = {
  basic: 10,        // $19.990
  trimestral: 20,   // $44.990
  anual: 50,        // $99.990
  vitalicio: 100,   // $249.990
};

export default function Comparador() {
  const { isLoggedIn, user } = useAuth();
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [q, setQ] = useState("");

  const planId = user?.planId || "basic";
  const mult = MULT_BY_PLAN[planId] ?? 10;

  return (
    <div className="bg-slate-900 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-8 text-white">
        <h1 className="text-2xl font-bold mb-4">Comparador</h1>

        {/* ====== BLOQUE NO LOGUEADO ====== */}
        {!isLoggedIn && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="text-white/90">
              Para generar cuotas, primero{" "}
              <a href="/#planes" className="underline" style={{ color: GOLD }}>
                compra una membresía
              </a>{" "}
              e inicia sesión.
            </div>
          </div>
        )}

        {/* ====== BLOQUE LOGUEADO ====== */}
        {isLoggedIn && (
          <>
            {/* Barra: fecha + búsqueda + generar (estilos pedidos) */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl px-3 py-2"
                style={{ backgroundColor: IVORY, color: "#0f172a" }} // azul marino oscuro
              />
              <input
                placeholder="Equipo / liga"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2"
                style={{ backgroundColor: IVORY, color: "#0f172a" }}
              />
              <button
                className="rounded-xl px-4 py-2 font-semibold"
                style={{ backgroundColor: GOLD, color: "#0f172a" }}
              >
                Generar
              </button>
            </div>

            {/* Tarjetas/Secciones (ya adaptadas por plan) */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Regalo */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-white font-semibold">
                  Cuota segura (regalo) 1.5–3 · 90–95% acierto
                </div>
                <div className="text-white/70 text-sm mt-1">
                  Próximamente: resultados basados en tus filtros.
                </div>
              </div>

              {/* Generada por plan */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-white font-semibold">
                  Cuota generada x{mult}
                </div>
                <div className="text-white/70 text-sm mt-1">
                  Tu plan: {planId.toUpperCase()}
                </div>
              </div>

              {/* Árbitros / aparece solo en anual y vitalicio */}
              {mult >= 50 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-white font-semibold">
                    Árbitros más tarjeteros
                  </div>
                  <div className="text-white/70 text-sm mt-1">Próximamente.</div>
                </div>
              )}

              {/* Desfase / aparece solo en anual y vitalicio */}
              {mult >= 50 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-white font-semibold">
                    Cuota desfase del mercado
                  </div>
                  <div className="text-white/70 text-sm mt-1">Próximamente.</div>
                </div>
              )}
            </div>

            {/* Upsell (ejemplo visual). Ocúltalo si es vitalicio */}
            {planId !== "vitalicio" && (
              <div className="mt-8">
                <h3 className="text-white text-xl font-bold mb-3">
                  ¿Estás listo para mejorar tus ganancias?
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {["x20", "x50", "x100"]
                    .filter((tag) => {
                      // Esconde la actual o inferiores
                      const want =
                        tag === "x20" ? 20 : tag === "x50" ? 50 : 100;
                      return want > mult;
                    })
                    .map((id) => (
                      <a
                        key={id}
                        href={
                          id === "x20"
                            ? "/#plan-trimestral"
                            : id === "x50"
                            ? "/#plan-anual"
                            : "/#plan-vitalicio"
                        }
                        onClick={(e) => {
                          // scroll suave
                          // (Vercel/SPA igual navega a la sección)
                        }}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-100 hover:opacity-90 transition"
                      >
                        <div className="text-white font-semibold">
                          Mejorar a {id}
                        </div>
                        <div className="text-sm text-white/70">
                          Haz clic para ir al plan.
                        </div>
                      </a>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Simulador al final */}
        <div className="mt-10">
          <Simulator />
        </div>
      </section>
    </div>
  );
}
