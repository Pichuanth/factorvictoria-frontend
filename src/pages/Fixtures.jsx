// src/pages/Fixtures.jsx
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

/* ---------- helpers de fechas / API ---------- */
const API_BASE = import.meta.env.VITE_API_BASE || "";

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

/* ---------- control de uso gratis ---------- */
const FREE_KEY_DATE = "fv_free_matches_date";
const FREE_KEY_COUNT = "fv_free_matches_count";
const FREE_LIMIT_PER_DAY = 2;

function getTodayStr() {
  return toYYYYMMDD(new Date());
}

function readFreeUsage() {
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
  try {
    const today = getTodayStr();
    const { date, count } = readFreeUsage();
    const newCount = date === today ? count + 1 : 1;
    localStorage.setItem(FREE_KEY_DATE, today);
    localStorage.setItem(FREE_KEY_COUNT, String(newCount));
  } catch {}
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

      const params = new URLSearchParams();
      params.set("date", date);
      params.set("status", "NS");

      const res = await fetch(`${API_BASE}/api/fixtures?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      let items = Array.isArray(data?.items) ? data.items : [];

      const qTrim = String(q || "").trim().toLowerCase();
      if (qTrim) {
        const normalizedCountry = normalizeCountryForApi(qTrim);
        if (normalizedCountry) {
          const countryLc = normalizedCountry.toLowerCase();
          items = items.filter(
            (fx) =>
              String(fx.league?.country || fx.country || "").toLowerCase() ===
              countryLc
          );
        } else {
          items = items.filter((fx) => {
            const home = String(fx.teams?.home?.name || "").toLowerCase();
            const away = String(fx.teams?.away?.name || "").toLowerCase();
            const league = String(fx.league?.name || "").toLowerCase();
            const country = String(fx.league?.country || "").toLowerCase();
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
      if (!isLoggedIn) incrementFreeUsage();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function handleGenerateOdds() {
    if (!isLoggedIn) {
      window.location.href = "/";
      return;
    }
    window.location.href = "/app";
  }

  const planLabel = useMemo(() => {
    const raw = user?.planId || user?.plan || "";
    return String(raw || "").toUpperCase();
  }, [user]);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* --- CONTENIDO EXISTENTE (igual al tuyo) --- */}
      {/* … TODO TU CÓDIGO DE FILTROS, TABLA, CTA … */}

      {/* ================= CIERRE VISUAL ================= */}
      <section className="mt-10 rounded-3xl border border-white/10 overflow-hidden bg-white/5">
        <div className="p-5 md:p-7">
          <h3 className="text-lg md:text-xl font-bold">
            Convierte información en ventaja
          </h3>
          <p className="text-slate-300 text-sm mt-1">
            Nuestra IA analiza estadísticas y señales del mercado en tiempo real
            para detectar cuotas con verdadero valor. Deja atrás las cuotas
            improvisadas en grupos sin estrategia ni análisis, apuesta con datos,
            planificación y visión ganadora. Apuesta como todo un campeón.
          </p>
        </div>

        <div className="w-full h-[260px] md:h-[360px] lg:h-[420px] bg-slate-950 overflow-hidden">
          <img
            src="/hero-partidos.png"
            alt="Partidos Factor Victoria"
            className="w-full h-full object-cover object-center"
          />
        </div>

        <div className="p-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Factor Victoria
        </div>
      </section>
    </div>
  );
}
