// src/pages/Comparator.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

/* --------------------- helpers --------------------- */

function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Alias ES -> EN para country de API-SPORTS
const COUNTRY_ALIAS = {
  chile: "Chile",
  argentina: "Argentina",
  españa: "Spain",
  espana: "Spain",
  inglaterra: "England",
  francia: "France",
};

function normalizeCountryQuery(q) {
  const key = String(q || "").toLowerCase().trim();
  return COUNTRY_ALIAS[key] || null;
}

/* --------------------- componente --------------------- */

export default function Comparator() {
  const { isLoggedIn, user } = useAuth();
  const [searchParams] = useSearchParams();

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(toYYYYMMDD(today));
  const [to, setTo] = useState(toYYYYMMDD(today));
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [fixtures, setFixtures] = useState([]);

  // Prefill desde /fixture -> "Generar" (date & q en la URL)
  useEffect(() => {
    const urlDate = searchParams.get("date");
    const urlQ = searchParams.get("q");
    if (urlDate) {
      setFrom(urlDate);
      setTo(urlDate);
    }
    if (urlQ) {
      setQ(urlQ);
    }
  }, [searchParams]);

  const planLabel = useMemo(() => {
    const raw = user?.planId || user?.plan?.id || user?.plan || user?.membership || "";
    return String(raw || "").toUpperCase();
  }, [user]);

  async function handleGenerate(e) {
    e?.preventDefault?.();
    setErr("");
    setFixtures([]);
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      params.set("status", "NS"); // solo partidos futuros / no iniciados

      const qTrim = String(q || "").trim();
      const countryEN = normalizeCountryQuery(qTrim);

      if (countryEN) {
        // filtro por país (Chile, Argentina, etc.)
        params.set("country", countryEN);
      } else if (qTrim) {
        // texto libre: liga, equipo, etc.
        params.set("q", qTrim);
      }

      const res = await fetch(`/api/fixtures?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} – ${res.statusText || ""}`);
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      if (!items.length) {
        setErr(
          "No hay partidos futuros reales suficientes para este rango o filtro. Prueba con más días o sin filtrar por país/equipo."
        );
        setFixtures([]);
        return;
      }

      setFixtures(items);
    } catch (e) {
      console.error(e);
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // Botón rápido de país
  function handleQuickCountry(countryEs) {
    setQ(countryEs);
  }

  const quickCountries = ["Chile", "Argentina", "España", "Inglaterra", "Francia"];

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* Cabecera */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">Comparador</h1>

        {isLoggedIn ? (
          <p className="text-slate-300 text-sm md:text-base">
            Estás usando Factor Victoria con tu membresía{" "}
            <span className="font-semibold">{planLabel || "ACTIVA"}</span>. Elige un rango de
            fechas y filtra por país, liga o equipo para generar tus parlays.
          </p>
        ) : (
          <p className="text-slate-300 text-sm md:text-base">
            Modo visitante: prueba el comparador con filtros reales pero con funcionalidad limitada.{" "}
            <Link to="/" className="underline font-semibold">
              Activa una membresía
            </Link>{" "}
            para desbloquear todas las herramientas profesionales.
          </p>
        )}
      </section>

      {/* Filtros */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <form
          onSubmit={handleGenerate}
          className="flex flex-col md:flex-row md:items-end gap-3 items-stretch"
        >
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
            />
          </div>

          <div className="flex-[2]">
            <label className="block text-xs text-slate-400 mb-1">
              Filtro (país / liga / equipo)
            </label>
            <input
              placeholder="Ej: Chile, La Liga, Colo Colo, Premier League..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl font-semibold px-4 py-2 mt-4 md:mt-0"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
            >
              {loading ? "Generando..." : "Generar"}
            </button>
          </div>
        </form>

        {/* Países rápidos */}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickCountries.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleQuickCountry(c)}
              className="text-xs md:text-sm rounded-full px-3 py-1 border border-white/15 bg-white/5 hover:bg-white/10 transition"
            >
              {c}
            </button>
          ))}
        </div>

        {/* Mensajes */}
        {err && (
          <div className="mt-3 text-sm text-amber-300">
            {err}
            {!isLoggedIn && (
              <>
                {" "}
                <Link to="/" className="underline font-semibold">
                  Ver planes
                </Link>
              </>
            )}
          </div>
        )}

        {!err && !loading && fixtures.length > 0 && (
          <div className="mt-3 text-xs text-slate-400">
            Se encontraron{" "}
            <span className="font-semibold text-slate-100">{fixtures.length}</span> partidos futuros
            para este rango de fechas.
          </div>
        )}
      </section>

      {/* Tarjetas de resultados (de momento, info / “próximamente”) */}
      <section className="mt-4 space-y-4">
        {/* Cuota segura (regalo) */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-200 mb-2">
            Cuota segura (Regalo)
            <span className="ml-2 text-[11px] text-yellow-100/90">x1.5–x3 · 90–95% acierto</span>
          </div>
          <p className="text-slate-200 text-sm">
            Próximamente: resultados basados en tus filtros para usar como “regalo” diario a tu
            comunidad.
          </p>
        </div>

        {/* Cuota generada x100 */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 mb-2">
            Cuota generada
            <span className="ml-2 text-[11px] text-emerald-100/90">x100</span>
          </div>
          {fixtures.length === 0 ? (
            <p className="text-slate-300 text-sm">
              Aún no hay picks para este rango o filtro. Genera primero partidos con el botón de
              arriba.
            </p>
          ) : (
            <p className="text-slate-200 text-sm">
              Próximamente: combinaremos partidos de este rango para buscar una cuota objetivo
              cercana a x100, según tu plan.
            </p>
          )}
        </div>

        {/* Árbitros más tarjeteros */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-200 mb-2">
            Árbitros más tarjeteros
          </div>
          <p className="text-slate-200 text-sm">
            Genera para ver recomendaciones sobre partidos con árbitros propensos a sacar tarjetas
            (ideal para over tarjetas).
          </p>
        </div>

        {/* Cuota desfase del mercado */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 mb-2">
            Cuota desfase del mercado
          </div>
          <p className="text-slate-200 text-sm">
            Próximamente: Factor Victoria te mostrará posibles errores de mercado con valor esperado
            positivo según tus filtros.
          </p>
        </div>
      </section>
    </div>
  );
}
