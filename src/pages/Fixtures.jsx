// src/pages/Fixtures.jsx
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

/* ---------- helpers de fechas ---------- */

function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Normaliza texto a nombre de país como viene desde API-FOOTBALL */
function normalizeCountryForApi(q) {
  const txt = String(q || "").trim().toLowerCase();

  if (txt === "chile") return "Chile";
  if (txt === "argentina") return "Argentina";
  if (txt === "españa" || txt === "espana") return "Spain";
  if (txt === "inglaterra") return "England";
  if (txt === "francia") return "France";

  return null;
}

/* ---------- control de uso gratis (localStorage) ---------- */

const FREE_KEY_DATE = "fv_free_matches_date";
const FREE_KEY_COUNT = "fv_free_matches_count";
const FREE_LIMIT_PER_DAY = 2; // 2 búsquedas gratis

function getTodayStr() {
  return toYYYYMMDD(new Date());
}

function readFreeUsage() {
  if (typeof window === "undefined") return { date: null, count: 0 };
  try {
    const date = localStorage.getItem(FREE_KEY_DATE);
    const raw = localStorage.getItem(FREE_KEY_COUNT);
    const count = raw ? Number(raw) || 0 : 0;
    return { date, count };
  } catch {
    return { date: null, count: 0 };
  }
}

function incrementFreeUsage() {
  if (typeof window === "undefined") return;
  try {
    const today = getTodayStr();
    const { date, count } = readFreeUsage();
    const newCount = date === today ? count + 1 : 1;
    localStorage.setItem(FREE_KEY_DATE, today);
    localStorage.setItem(FREE_KEY_COUNT, String(newCount));
  } catch {
    // ignorar errores de localStorage
  }
}

function hasReachedFreeLimit() {
  const today = getTodayStr();
  const { date, count } = readFreeUsage();
  return date === today && count >= FREE_LIMIT_PER_DAY;
}

/* ---------- componente ---------- */

export default function Fixtures() {
  const { isLoggedIn, user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [date, setDate] = useState(toYYYYMMDD(today));
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);
  const [limitMsg, setLimitMsg] = useState("");

  const quickCountries = ["Chile", "Argentina", "España", "Inglaterra", "Francia"];

  async function handleSearch(e) {
    e?.preventDefault?.();
    setErr("");
    setLimitMsg("");

    // Si no está logueado, aplicamos límite de uso gratis
    if (!isLoggedIn && hasReachedFreeLimit()) {
      setLimitMsg(
        "Has alcanzado tu límite diario de búsquedas gratis. Crea tu cuenta y activa tu membresía para seguir explorando todos los partidos y usar el comparador profesional."
      );
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      setRows([]);

      // IMPORTANTE: solo pedimos por fecha + status.
      // Nada de country ni q aquí para no provocar 400 en la API.
      const params = new URLSearchParams();
      params.set("date", date);
      params.set("status", "NS"); // solo futuros / no iniciados

      const res = await fetch(`/api/fixtures?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} – ${res.statusText}`);
      }

      const data = await res.json();
      let items = Array.isArray(data?.items) ? data.items : [];

      // ---- Filtro en frontend (país / equipo / liga) ----
      const qTrim = String(q || "").trim().toLowerCase();
      if (qTrim) {
        const normalizedCountry = normalizeCountryForApi(qTrim);

        if (normalizedCountry) {
          // Filtro por país exacto
          const countryLc = normalizedCountry.toLowerCase();
          items = items.filter((fx) => {
            const c = String(fx.league?.country || fx.country || "").toLowerCase();
            return c === countryLc;
          });
        } else {
          // Búsqueda por equipo / liga / país parcial
          items = items.filter((fx) => {
            const home = String(
              fx.teams?.home?.name || fx.teams?.home || ""
            ).toLowerCase();
            const away = String(
              fx.teams?.away?.name || fx.teams?.away || ""
            ).toLowerCase();
            const league = String(fx.league?.name || "").toLowerCase();
            const country = String(
              fx.league?.country || fx.country || ""
            ).toLowerCase();

            return (
              home.includes(qTrim) ||
              away.includes(qTrim) ||
              league.includes(qTrim) ||
              country.includes(qTrim)
            );
          });
        }
      }

      setRows(items);

      // sólo contamos como uso si no está logueado
      if (!isLoggedIn) {
        incrementFreeUsage();
      }
    } catch (e) {
      console.error(e);
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function handleQuickCountry(country) {
    setQ(country);
  }

  function handleGenerateOdds(row) {
    // Si no está logueado, lo mandamos a la landing/planes
    if (!isLoggedIn) {
      window.location.href = "/";
      return;
    }

    // Más adelante podemos guardar el partido en localStorage
    // para que el Comparador lo tome como preferido.
    window.location.href = "/app";
  }

  const planLabel = useMemo(() => {
    const raw = user?.planId || user?.plan?.id || user?.plan || user?.membership || "";
    return String(raw || "").toUpperCase();
  }, [user]);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* Cabecera */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">Partidos</h1>

        {isLoggedIn ? (
          <p className="text-slate-300 text-sm md:text-base">
            Estás usando Factor Victoria con tu membresía{" "}
            <span className="font-semibold">{planLabel || "ACTIVA"}</span>. Filtra por fecha, país,
            liga o equipo y combina esta información con el comparador para crear tus parlays.
          </p>
        ) : (
          <p className="text-slate-300 text-sm md:text-base">
            Modo visitante: puedes ver partidos de Chile, Argentina, España, Inglaterra y Francia
            con búsquedas limitadas por día. Para desbloquear uso ilimitado y el comparador
            profesional, crea tu cuenta y{" "}
            <Link to="/" className="underline font-semibold">
              activa una membresía
            </Link>
            .
          </p>
        )}
      </section>

      {/* Filtros */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <form
          onSubmit={handleSearch}
          className="flex flex-col md:flex-row gap-3 items-stretch md:items-end"
        >
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
            />
          </div>

          <div className="flex-[2]">
            <label className="block text-xs text-slate-400 mb-1">
              Buscar (equipo / liga / país)
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
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </form>

        {/* Botones rápidos de países */}
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

        {/* Mensajes de error / límite / info */}
        {err && <div className="text-red-400 mt-3 text-sm">Error: {err}</div>}

        {!err && limitMsg && (
          <div className="mt-3 text-amber-300 text-sm">
            {limitMsg}{" "}
            <Link to="/" className="underline font-semibold">
              Ver planes
            </Link>
          </div>
        )}

        {!err && !limitMsg && !loading && !rows.length && (
          <div className="mt-3 text-slate-400 text-sm">
            Sin datos aún. Elige una fecha y pulsa <span className="font-semibold">Buscar</span>.
          </div>
        )}
      </section>

      {/* Tabla de partidos */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm md:text-base font-semibold text-slate-100">
            {rows.length} partidos
          </h2>
          {rows.length > 0 && (
            <p className="text-xs text-slate-400">
              Horas en tu zona horaria local. Solo partidos futuros / no iniciados.
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-100">
            <thead className="text-xs uppercase text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-2 pr-4 text-left">Hora</th>
                <th className="py-2 pr-4 text-left">Local</th>
                <th className="py-2 pr-4 text-left">Visita</th>
                <th className="py-2 pr-4 text-left">Liga</th>
                <th className="py-2 pr-4 text-left">País</th>
                <th className="py-2 pr-4 text-left">Cuota</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-slate-500 text-center text-sm">
                    Sin datos
                  </td>
                </tr>
              ) : (
                rows.map((fx) => {
                  const id =
                    fx.fixtureId ??
                    fx.fixture?.id ??
                    `${fx.league?.id || ""}-${fx.teams?.home}-${fx.teams?.away}-${fx.date}`;

                  const ts =
                    fx.timestamp ??
                    fx.fixture?.timestamp ??
                    (fx.date ? Math.floor(Date.parse(fx.date) / 1000) : null) ??
                    (fx.fixture?.date ? Math.floor(Date.parse(fx.fixture.date) / 1000) : null);

                  const dateTime = ts ? new Date(ts * 1000) : null;
                  const timeStr = dateTime
                    ? dateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "-";

                  const home = fx.teams?.home?.name || fx.teams?.home || "—";
                  const away = fx.teams?.away?.name || fx.teams?.away || "—";
                  const league = fx.league?.name || "—";
                  const country = fx.league?.country || fx.country || "—";

                  return (
                    <tr
                      key={id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-2 pr-4 whitespace-nowrap text-slate-200">{timeStr}</td>
                      <td className="py-2 pr-4 text-slate-100">{home}</td>
                      <td className="py-2 pr-4 text-slate-100">{away}</td>
                      <td className="py-2 pr-4 text-slate-200">{league}</td>
                      <td className="py-2 pr-4 text-slate-200">{country}</td>
                      <td className="py-2 pr-4 text-slate-200">
                        <button
                          type="button"
                          onClick={() => handleGenerateOdds(fx)}
                          className="text-xs md:text-sm underline font-semibold"
                        >
                          Generar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* CTA hacia comparador */}
        <div className="mt-4 text-xs md:text-sm text-slate-300">
          ¿Quieres transformar estos partidos en parlays x10, x20 o x50?
          <span className="ml-1">
            <Link to="/app" className="underline font-semibold">
              Abre el Comparador
            </Link>{" "}
            y genera combinadas basadas en estos encuentros.
          </span>
        </div>
      </section>
    </div>
  );
}
