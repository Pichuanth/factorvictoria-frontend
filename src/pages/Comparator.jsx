// src/pages/Comparator.jsx
import React, { useState } from "react";
import Simulator from "../components/Simulator";
import { useAuth, PLAN_RANK } from "../lib/auth";
import { SECTION_TITLES } from "../lib/prompt";

/* ================= Helpers: rank por plan ================= */

const PRICE_TO_RANK = {
  19990: PLAN_RANK.basic,       // x10
  44990: PLAN_RANK.trimestral,  // x20
  99990: PLAN_RANK.anual,       // x50
  249990: PLAN_RANK.vitalicio,  // x100
};

const STR_TO_RANK = {
  basic: PLAN_RANK.basic,
  basico: PLAN_RANK.basic,
  básico: PLAN_RANK.basic,
  mensual: PLAN_RANK.basic,

  trimestral: PLAN_RANK.trimestral,

  anual: PLAN_RANK.anual,
  yearly: PLAN_RANK.anual,

  vitalicio: PLAN_RANK.vitalicio,
  lifetime: PLAN_RANK.vitalicio,
};

const EMAIL_HINT_TO_RANK = {
  "basico@demo.cl": PLAN_RANK.basic,
  "trimestral@demo.cl": PLAN_RANK.trimestral,
  "anual@demo.cl": PLAN_RANK.anual,
  "vitalicio@demo.cl": PLAN_RANK.vitalicio,
};

const RANK_TO_LABEL = {
  [PLAN_RANK.basic]: "BÁSICO",
  [PLAN_RANK.trimestral]: "TRIMESTRAL",
  [PLAN_RANK.anual]: "ANUAL",
  [PLAN_RANK.vitalicio]: "VITALICIO",
};

const RANK_TO_MULT = {
  [PLAN_RANK.basic]: 10,
  [PLAN_RANK.trimestral]: 20,
  [PLAN_RANK.anual]: 50,
  [PLAN_RANK.vitalicio]: 100,
};

function deriveRank(user) {
  // 1) rank numérico ya listo
  if (typeof user?.rank === "number") return user.rank;

  // 2) rank string (ej: "vitalicio")
  if (typeof user?.rank === "string") {
    const k = user.rank.trim().toLowerCase();
    if (k in STR_TO_RANK) return STR_TO_RANK[k];
  }

  // 3) por nombre de plan en string (user.plan, user.planName, etc.)
  const planName =
    user?.plan ||
    user?.planName ||
    user?.membership ||
    user?.tier ||
    "";
  if (typeof planName === "string") {
    const k = planName.trim().toLowerCase();
    if (k in STR_TO_RANK) return STR_TO_RANK[k];
  }

  // 4) por precio (CLP) si viene en algún campo
  const price =
    Number(String(user?.priceCLP || user?.planPrice || user?.price || "").replace(/\D/g, "")) ||
    null;
  if (price && PRICE_TO_RANK[price]) return PRICE_TO_RANK[price];

  // 5) por email demo (solo para las cuentas de prueba)
  const email = (user?.email || "").toLowerCase();
  if (EMAIL_HINT_TO_RANK[email]) return EMAIL_HINT_TO_RANK[email];

  // fallback
  return PLAN_RANK.basic;
}

/* ========================================================== */

export default function Comparator() {
  const { isLoggedIn, user } = useAuth();
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [q, setQ] = useState("");

  const rank = deriveRank(user);
  const mult = RANK_TO_MULT[rank] ?? 10;
  const planLabel = RANK_TO_LABEL[rank] ?? "—";

  const Wrapper = ({ children }) => (
    <div className="bg-slate-900 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-8 text-white">{children}</section>
    </div>
  );

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

  // ¿Mostrar upsell (bloques bloqueados)?
  const showUpsell = rank < PLAN_RANK.vitalicio;
  const lockedPlans =
    rank === PLAN_RANK.basic
      ? ["x20", "x50", "x100"]
      : rank === PLAN_RANK.trimestral
      ? ["x50", "x100"]
      : rank === PLAN_RANK.anual
      ? ["x100"]
      : [];

  // Secciones habilitadas por plan:
  const hasArbitros = rank >= PLAN_RANK.anual;     // Anual y Vitalicio
  const hasDesfase = rank >= PLAN_RANK.anual;      // Anual y Vitalicio

  return (
    <Wrapper>
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

      {/* Secciones */}
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

        {/* xPlan con multiplicador correcto y etiqueta del plan */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-white font-semibold">
            {`${SECTION_TITLES.xPlan} x${mult}`}
          </div>
          <div className="text-white/70 text-sm mt-1">Tu plan: {planLabel}</div>
        </div>

        {/* Árbitros más tarjeteros (solo Anual/Vitalicio) */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-white font-semibold">
            {SECTION_TITLES.arbitros}
          </div>
          {hasArbitros ? (
            <div className="text-white/70 text-sm mt-1">Próximamente.</div>
          ) : (
            <div
              onClick={() => (window.location.href = "/#planes")}
              className="mt-2 inline-flex px-3 py-1.5 rounded-lg bg-white/10 text-white/80 text-sm cursor-pointer hover:bg-white/15"
              title="Mejorar plan"
            >
              Contenido bloqueado 🔒 — Mejorar plan
            </div>
          )}
        </div>

        {/* Cuota desfase del mercado (solo Anual/Vitalicio) */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-white font-semibold">
            {SECTION_TITLES.desfase}
          </div>
          {hasDesfase ? (
            <div className="text-white/70 text-sm mt-1">Próximamente.</div>
          ) : (
            <div
              onClick={() => (window.location.href = "/#planes")}
              className="mt-2 inline-flex px-3 py-1.5 rounded-lg bg-white/10 text-white/80 text-sm cursor-pointer hover:bg-white/15"
              title="Mejorar plan"
            >
              Contenido bloqueado 🔒 — Mejorar plan
            </div>
          )}
        </div>
      </div>

      {/* Upsell final */}
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

      {/* Simulador */}
      <div className="mt-10">
        <Simulator />
      </div>
    </Wrapper>
  );
}
