// src/pages/Comparator.jsx
import React, { useState } from "react";
import Simulator from "../components/Simulator";
import { useAuth, PLAN_RANK } from "../lib/auth"; // <-- OJO la ruta

// Multiplicador por plan (lo que debe ver cada membresía)
const MULTIPLIER_BY_PLAN = {
  BASICO: 10,         // $19.990
  TRIMESTRAL: 20,     // $44.990
  ANUAL: 50,          // $99.990
  VITALICIO: 100,     // $249.990
};

export default function Comparator() {
  const { isLoggedIn, getUser } = useAuth();
  const user = getUser(); // { email, plan } cuando está logueado
  const plan = user?.plan || "BASICO";
  const rank = PLAN_RANK[plan] ?? 1;
  const multiplier = MULTIPLIER_BY_PLAN[plan];

  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [q, setQ] = useState("");

  // ---------- Vista bloqueada si NO está logueado ----------
  if (!isLoggedIn) {
    return (
      <div className="bg-slate-900 min-h-screen">
        <section className="max-w-6xl mx-auto px-4 py-12 text-white">
          <h1 className="text-2xl font-bold mb-4">Comparador</h1>
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

  // ---------- Vista para usuarios con plan ----------
  return (
    <div className="bg-slate-900 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-8 text-white">
        {/* Barra de filtros */}
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

        {/* Secciones solicitadas */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* 1) Cuota segura (regalo) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold">
              Cuota segura (regalo) 1.5–3 · 90–95% acierto
            </div>
            <div className="text-white/70 text-sm mt-1">
              Próximamente: resultados basados en tus filtros.
            </div>
          </div>

          {/* 2) Cuota generada por plan */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold">
              Cuota generada x{multiplier}
            </div>
            <div className="text-white/70 text-sm mt-1">Tu plan: {plan}</div>
          </div>

          {/* 3) Árbitros más tarjeteros (reemplaza “probabilidad…”) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold">Árbitros más tarjeteros</div>
            <div className="text-white/70 text-sm mt-1">
              Próximamente: ranking por torneo y fecha.
            </div>
          </div>

          {/* 4) Desfase del mercado */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold">Desfase del mercado</div>
            <div className="text-white/70 text-sm mt-1">
              Incluido en todas las membresías.
            </div>
          </div>
        </div>

        {/* Upsell: oculto si es VITALICIO; bloqueado según rango para otros */}
        {plan !== "VITALICIO" && (
          <div className="mt-8">
            <h3 className="text-white text-xl font-bold mb-3">
              ¿Estás listo para mejorar tus ganancias?
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { tag: "x20", need: "TRIMESTRAL" },
                { tag: "x50", need: "ANUAL" },
                { tag: "x100", need: "VITALICIO" },
              ].map((p) => {
                const requiredRank = PLAN_RANK[p.need];
                const locked = rank < requiredRank;
                const to = "/#planes";
                return (
                  <div
                    key={p.tag}
                    onClick={() => (window.location.href = to)}
                    className={
                      "rounded-2xl border border-white/10 bg-white/5 p-4 " +
                      (locked ? "opacity-60 cursor-pointer" : "")
                    }
                  >
                    <div className="text-white font-semibold">
                      Plan {p.tag.toUpperCase()}
                    </div>
                    <div className="text-sm text-white/70">
                      {locked ? "Contenido bloqueado 🔒" : "Incluido en tu plan"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Simulador al final */}
        <div className="mt-10">
          <Simulator />
        </div>
      </section>
    </div>
  );
}
