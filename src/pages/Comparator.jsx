// src/pages/Comparator.jsx
import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { getFixturesByDate, } from "../api/fixtures";
import { getOddsByFixture } from "../api/odds";

const GOLD = "#E6C464";
const BG   = "bg-slate-900";

// Multiplicador por plan
const MULTIPLIER = {
  basic: 10,         // $19.990
  trimestral: 20,    // $44.990
  anual: 50,         // $99.990
  vitalicio: 100,    // $249.990
};

function Section({ title, children, muted=false }) {
  return (
    <div className={`rounded-2xl ${muted ? "bg-white/5" : "bg-white/10"} p-5 text-white`}>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="text-white/80">{children}</div>
    </div>
  );
}

export default function Comparator() {
  const { isLoggedIn, user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [q, setQ]       = useState("");
  const [err, setErr]   = useState("");
  const [loading, setLoading] = useState(false);
  const [fixtures, setFixtures] = useState([]);

  const apiKeyMissing = !import.meta.env.VITE_APIFOOTBALL_KEY;

  const planId = user?.planId || "basic";
  const xN     = MULTIPLIER[planId] ?? 10;

  const isAnual      = planId === "anual" || planId === "vitalicio";
  const isVitalicio  = planId === "vitalicio";

  async function onGenerate(e) {
    e?.preventDefault?.();
    setErr("");
    setFixtures([]);
    if (apiKeyMissing) {
      setErr("Falta VITE_APIFOOTBALL_KEY. Configura tu .env y variables en Vercel.");
      return;
    }
    if (!isLoggedIn) {
      setErr("Inicia sesión para generar cuotas.");
      return;
    }
    try {
      setLoading(true);
      const list = await getFixturesByDate(date, q);
      if (Array.isArray(list)) setFixtures(list);
      else if (list?.error) setErr(list.error);
      else setErr("No se pudieron obtener partidos.");
    } catch (e2) {
      setErr(String(e2.message || e2));
    } finally {
      setLoading(false);
    }
  }

  // Vista bloqueada (no logueado)
  if (!isLoggedIn) {
    return (
      <div className={`${BG} min-h-[70vh]`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="rounded-2xl bg-white/10 text-white p-6">
            Para generar cuotas, primero <a href="/#planes" className="underline" style={{color: GOLD}}>compra una membresía</a> e inicia sesión.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${BG} min-h-[70vh]`}>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Formulario */}
        <form onSubmit={onGenerate} className="rounded-2xl bg-white/5 p-4">
          <div className="grid md:grid-cols-[220px,1fr,160px] gap-3 items-center">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white text-slate-900"
            />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Equipo / liga / país (id de liga para filtrar)"
              className="w-full px-4 py-3 rounded-2xl bg-white text-slate-900"
            />
            <button
              className="px-4 py-3 rounded-2xl font-semibold"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
              disabled={loading}
            >
              {loading ? "Generando…" : "Generar"}
            </button>
          </div>

          {apiKeyMissing && (
            <div className="mt-3 text-sm text-rose-400">
              Falta VITE_APIFOOTBALL_KEY. Configura tu .env y variables en Vercel.
            </div>
          )}
          {!!err && <div className="mt-3 text-sm text-rose-400">{err}</div>}
        </form>

        {/* Sección: Cuota segura */}
        <Section title="Cuota segura (Regalo) x1.5–x3 · 90–95% acierto">
          Próximamente: resultados basados en tus filtros.
        </Section>

        {/* Sección: Cuota generada por plan */}
        <Section title={`Cuota generada x${xN}`}>
          <div className="uppercase text-sm opacity-80">Tu plan: {planId}</div>
          {fixtures.length === 0 ? (
            <div className="mt-2 opacity-70">Genera para ver partidos y cuotas.</div>
          ) : (
            <ul className="mt-2 space-y-1">
              {fixtures.slice(0, 6).map((fx) => (
                <li key={fx.fixture?.id} className="opacity-90">
                  {fx.teams?.home?.name} vs {fx.teams?.away?.name} — {new Date(fx.fixture?.date).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Árbitros más tarjeteros (solo Anual/Vitalicia) */}
        <Section title="Árbitros más tarjeteros" muted={!isAnual}>
          {isAnual ? "Disponible con tu plan." : "Disponible al mejorar tu plan."}
        </Section>

        {/* Desfase del mercado (solo Anual/Vitalicia) */}
        <Section title="Cuota desfase del mercado" muted={!isAnual}>
          {isAnual ? "Disponible con tu plan." : "Disponible al mejorar tu plan."}
        </Section>
      </div>
    </div>
  );
}
