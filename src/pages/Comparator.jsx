// src/pages/Comparator.jsx
import React, { useMemo, useState } from "react";
import { getFixturesByDate } from "../api/fixtures";
import { useAuth } from "../lib/auth";

// Colores del proyecto
const GOLD = "#E6C464";
const IVORY = "#FFFFF0";
const NAVY  = "#0f172a";

// Multiplicador por plan
const PLAN_MULTIPLIER = {
  basic: 10,
  trimestral: 20,
  anual: 50,
  vitalicio: 100,
};

// Secciones visibles según plan
const SECTION_TITLES = {
  regalo: "Cuota segura (Regalo) x1.5–x3 · 90–95% acierto",
  generada: (m) => `Cuota generada x${m}`,
  arbitros: "Árbitros más tarjeteros",
  desfase: "Cuota desfase del mercado",
};

function SectionCard({ title, children, locked = false }) {
  return (
    <div className="rounded-2xl p-5 mt-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-white font-semibold">{title}</div>
      {locked ? (
        <div className="text-white/60 text-sm mt-2">Disponible al mejorar tu plan.</div>
      ) : (
        <div className="text-white/80 text-sm mt-2">{children}</div>
      )}
    </div>
  );
}

export default function Comparator() {
  const { user } = useAuth();
  const planId = user?.planId || "basic";
  const multiplier = PLAN_MULTIPLIER[planId] || 10;

  // Filtros arriba
  const [date, setDate] = useState(() => {
    const d = new Date();
    const iso = d.toISOString().slice(0, 10);
    return iso;
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [fixtures, setFixtures] = useState([]);

  const showArbitrosYDesfase = planId === "anual" || planId === "vitalicio";

  async function onGenerate(e) {
    e?.preventDefault?.();
    setErr("");
    setLoading(true);
    setFixtures([]);

    try {
      const list = await getFixturesByDate(date, query);
      setFixtures(list);
    } catch (ex) {
      setErr(ex.message || String(ex));
    } finally {
      setLoading(false);
    }
  }

  const count = fixtures.length;

  return (
    <div className="min-h-[70vh] bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Controles (colores solicitados) */}
        <form onSubmit={onGenerate} className="rounded-2xl p-4 mb-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="grid gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3"
              style={{ background: IVORY, color: NAVY }}
            />
            <input
              type="text"
              placeholder="Equipo / liga / país"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl px-4 py-3"
              style={{ background: IVORY, color: NAVY }}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl px-4 py-3 font-semibold"
              style={{ background: GOLD, color: NAVY }}
            >
              {loading ? "Generando..." : "Generar"}
            </button>
            {err && (
              <div className="text-red-400 text-sm">
                {err}
              </div>
            )}
            {!err && !loading && count > 0 && (
              <div className="text-white/70 text-sm">
                {count} partidos encontrados para {date}.
              </div>
            )}
          </div>
        </form>

        {/* Secciones */}
        <SectionCard title={SECTION_TITLES.regalo}>
          Próximamente: resultados basados en tus filtros.
        </SectionCard>

        <SectionCard title={SECTION_TITLES.generada(multiplier)}>
          Tu plan: <b className="text-white">{planId.toUpperCase()}</b>
        </SectionCard>

        <SectionCard
          title={SECTION_TITLES.arbitros}
          locked={!showArbitrosYDesfase}
        >
          Próximamente: árbitros con mayor promedio de tarjetas por liga/país.
        </SectionCard>

        <SectionCard
          title={SECTION_TITLES.desfase}
          locked={!showArbitrosYDesfase}
        >
          Próximamente: picks con desfase detectado vs mercado.
        </SectionCard>
      </div>
    </div>
  );
}
