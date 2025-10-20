// src/pages/Comparator.jsx
import React, { useMemo, useState } from "react";
import Simulator from "../components/Simulator";
import { useAuth } from "../lib/auth";          // ya lo tienes
import { buildPrompt, PLAN_MULTIPLIER } from "../lib/prompt";

export default function Comparator() {
  const { user, isLoggedIn, plan } = useAuth(); // plan: 'mensual'|'trimestral'|'anual'|'vitalicio'
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");
  const [prompt, setPrompt] = useState("");

  const multiplier = PLAN_MULTIPLIER[plan] ?? 10;
  const isVitalicio = plan === "vitalicio";

  const handleGenerate = () => {
    const p = buildPrompt({ date, query: q, plan });
    setPrompt(p);
    // Aquí luego puedes llamar a tu backend/LLM con `p` y setear resultados reales
    // Por ahora solo mostramos el prompt para depurar si lo necesitas (no en UI)
    console.log("PROMPT >>>\n", p);
  };

  // ---------- VIEW (NO LOGUEADO) ----------
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

  // ---------- VIEW (LOGUEADO) ----------
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
            placeholder="Equipo / liga / país"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 bg-[#FFFFF0] text-slate-900"
          />
          <button
            onClick={handleGenerate}
            className="rounded-xl px-4 py-2 bg-[#E6C464] text-slate-900 font-semibold"
          >
            Generar
          </button>
        </div>

        {/* Secciones */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* 1) Regalo 1.5–3 */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold">
              Cuota segura (regalo) 1.5–3 · 90–95% de acierto
            </div>
            <div className="text-white/70 text-sm mt-1">
              Selección conservadora con valor positivo. Ideal para comenzar con verde.
            </div>
          </div>

          {/* 2) xN según plan */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold">
              Cuota generada x{multiplier}{isVitalicio ? " (Vitalicio)" : ""}
            </div>
            <div className="text-white/70 text-sm mt-1">
              Combinación optimizada para multiplicar por {multiplier}. Riesgo controlado, foco en valor.
            </div>
          </div>

          {/* 3) Árbitros más tarjeteros (reemplaza probabilidad) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold">Árbitros más tarjeteros</div>
            <div className="text-white/70 text-sm mt-1">
              Encuentros con jueces de alta media de tarjetas. Útil para mercados de tarjetas y O/U.
            </div>
          </div>

          {/* 4) Desfase del mercado */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold">Desfase del mercado</div>
            <div className="text-white/70 text-sm mt-1">
              Oportunidades donde la línea/cuota difiere del precio “justo” según nuestras métricas.
            </div>
          </div>
        </div>

        {/* Upsell (oculto en Vitalicio) */}
        {!isVitalicio && (
          <div className="mt-8">
            <h3 className="text-white text-xl font-bold mb-3">
              ¿Estás listo para mejorar tus ganancias?
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Estos son ejemplos visuales bloqueados; al hacer click, lleva a planes */}
              {["x20", "x50", "x100"].map((id) => (
                <a
                  key={id}
                  href="/#planes"
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-70 hover:opacity-100 cursor-pointer"
                >
                  <div className="text-white font-semibold">Plan {id}</div>
                  <div className="text-sm text-white/70">Contenido bloqueado 🔒</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Simulador */}
        <div className="mt-10">
          <Simulator />
        </div>
      </section>
    </div>
  );
}
