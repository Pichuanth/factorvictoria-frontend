// src/pages/Comparator.jsx
import React, { useState } from "react";
import Simulator from "../components/Simulator";
import { useAuth, PLAN_RANK } from "../lib/auth";
import { PROMPTS, SECTION_TITLES, PLAN_MULTIPLIER } from "../lib/prompt";

export default function Comparator() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");

  // --- Bloqueo si NO está logueado ---
  if (!user) {
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

  // --- Calcula multiplicador según plan ---
  const rank = PLAN_RANK[user.plan] ?? 0;
  const x = PLAN_MULTIPLIER[rank] ?? 10; // fallback
  const xLabel = `x${x}`;

  // (Por ahora simulamos datos. Luego puedes llamar a tu backend/API usando PROMPTS.vitalicio si quieres IA.)
  const data = {
    regalo: [
      { texto: "Equipo A gana (1.55) • liga X", razon: "racha + localía" },
    ],
    xPlan: [
      { texto: `Combinada ${xLabel}: A + B + C`, razon: "correlación positiva" },
    ],
    arbitros: [
      { texto: "Liga Y • Árbitro Z: +5.6 amarillas/partido", razon: "histórico 10j" },
    ],
    desfase: [
      { texto: "Over 0.5 goles 1T (1.90) en Partido K", razon: "línea tardía" },
    ],
  };

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
          <button
            className="rounded-xl px-4 py-2 bg-[#E6C464] text-slate-900 font-semibold"
            onClick={() => {
              // Aquí, si tienes backend/IA, harías la llamada usando PROMPTS.vitalicio + filtros (date, q).
              console.log("PROMPT:", PROMPTS.vitalicio, { date, q, plan: user.plan, x });
              alert("Cuotas generadas (demo).");
            }}
          >
            Generar
          </button>
        </div>

        {/* Secciones */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card title={SECTION_TITLES.regalo}>
            {data.regalo.map((i, k) => (
              <Item key={k} {...i} />
            ))}
          </Card>

          <Card title={`${SECTION_TITLES.xPlan} ${xLabel}`}>
            {data.xPlan.map((i, k) => (
              <Item key={k} {...i} />
            ))}
          </Card>

          <Card title={SECTION_TITLES.arbitros}>
            {data.arbitros.map((i, k) => (
              <Item key={k} {...i} />
            ))}
          </Card>

          <Card title={SECTION_TITLES.desfase}>
            {data.desfase.map((i, k) => (
              <Item key={k} {...i} />
            ))}
          </Card>
        </div>

        {/* Upsell (si NO es vitalicio) */}
        {rank < 3 && (
          <div className="mt-8">
            <h3 className="text-white text-xl font-bold mb-3">
              ¿Estás listo para mejorar tus ganancias?
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[20, 50, 100]
                .filter((mx) => mx > x)
                .map((mx) => (
                  <div
                    key={mx}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-60 cursor-pointer hover:opacity-80"
                    onClick={() => (window.location.href = "/#planes")}
                  >
                    <div className="text-white font-semibold">Plan x{mx}</div>
                    <div className="text-sm text-white/70">Contenido bloqueado 🔒</div>
                  </div>
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

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-white font-semibold">{title}</div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Item({ texto, razon }) {
  return (
    <div className="text-white/90">
      <div>• {texto}</div>
      {razon && <div className="text-white/60 text-sm">{razon}</div>}
    </div>
  );
}
