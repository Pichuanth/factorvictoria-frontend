import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

// Página PARTIDOS: centro de estadísticas con Widgets oficiales de API-FOOTBALL.
// Requiere membresía (o al menos sesión) para acceder.
// Tutorial: https://www.api-football.com/news/post/how-to-create-a-sports-website-in-just-a-few-minutes-using-widgets

const WIDGET_SCRIPT_SRC = "https://widgets.api-sports.io/3.1.0/widgets.js";


// Ligas "core" para mantener esta pestaña liviana (solo lo esencial)
const LEAGUE_PRESETS = [
  { country: "Argentina", league: "Liga Profesional", id: 128 },
  { country: "Argentina", league: "Copa Argentina", id: 130 },
  { country: "Brazil", league: "Serie A", id: 71 },
  { country: "Chile", league: "Primera División", id: 265 },
  { country: "Colombia", league: "Primera A", id: 239 },
  { country: "Mexico", league: "Liga MX", id: 262 },
  { country: "Spain", league: "La Liga", id: 140 },
  { country: "England", league: "Premier League", id: 39 },
  { country: "Italy", league: "Serie A", id: 135 },
  { country: "Germany", league: "Bundesliga", id: 78 },
  { country: "Portugal", league: "Primeira Liga", id: 94 },
  { country: "France", league: "Ligue 1", id: 61 },
];

function ensureWidgetScriptLoaded() {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`);
    if (existing) return resolve(true);

    const s = document.createElement("script");
    s.src = WIDGET_SCRIPT_SRC;
    s.type = "module";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = (e) => reject(e);
    document.body.appendChild(s);
  });
}

function refreshApiSportsWidgets() {
  // En SPA (React Router), los custom elements a veces no se “re-hidratan” al navegar.
  // Forzamos re-render interno del widget y disparamos DOMContentLoaded como sugiere el tutorial.
  const widgets = Array.from(document.querySelectorAll("api-sports-widget"));
  widgets.forEach((w) => {
    try {
      // Reset interno
      w.innerHTML = "";
      if (typeof w.connectedCallback === "function") w.connectedCallback();
    } catch (_) {
      // no-op
    }
  });

  try {
    window.document.dispatchEvent(
      new Event("DOMContentLoaded", { bubbles: true, cancelable: true })
    );
  } catch (_) {
    // no-op
  }
}

export default function Fixtures() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

// Selector liviano (evita cargar miles de ligas/países en el widget de "leagues")
const [leagueId, setLeagueId] = useState(LEAGUE_PRESETS[0].id);
const [season, setSeason] = useState(new Date().getFullYear());
const [day, setDay] = useState(() => {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
});

  // Ajusta esto si tu backend/front maneja planes de otra forma.
  const hasMembership = !!(user && (user.planId || user.plan || user.membership));

  const widgetKey = useMemo(() => {
    // OJO: Esto corre en FRONT. La key del widget se verá en el navegador.
    // API-SPORTS entiende que las keys para widgets se usan en cliente.
    return (
      import.meta?.env?.VITE_APISPORTS_WIDGET_KEY ||
      import.meta?.env?.VITE_APISPORTS_KEY ||
      ""
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureWidgetScriptLoaded();
        if (cancelled) return;

        // Espera un tick para asegurar que el DOM esté montado
        setTimeout(() => {
          if (cancelled) return;
          refreshApiSportsWidgets();
        }, 50);
      } catch (e) {
        // Si falla la carga del script, igual dejamos la UI (con mensaje).
        console.error("[WIDGETS] Error cargando script:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Gating (si quieres solo miembros, deja solo hasMembership)
  if (!isLoggedIn || !hasMembership) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-2xl w-full rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-white/60">Módulo premium</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            Partidos & Estadísticas
          </h1>
          <p className="mt-2 text-white/70">
            Este centro de estadísticas es solo para miembros. Activa tu plan o inicia sesión.
          </p>

          <div className="mt-5 flex gap-3">
            <button
              className="px-4 py-2 rounded-xl bg-[#E6C464] text-black font-semibold hover:opacity-90"
              onClick={() => navigate("/")}
            >
              Ver planes
            </button>
            <button
              className="px-4 py-2 rounded-xl border border-white/15 text-white hover:bg-white/5"
              onClick={() => navigate("/login")}
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay key, muestra un aviso (pero igual renderiza estructura).
  const showKeyWarning = !widgetKey;

  return (
    <div className="px-4 md:px-8 py-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-white/60">Centro de estadísticas</div>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              Partidos & Estadísticas
            </h1>
            <p className="mt-1 text-white/70">
              Selecciona una liga, revisa los partidos del día y abre el detalle con estadísticas.
            </p>
          </div>
          <div className="text-xs text-white/50">Widgets oficiales de API-FOOTBALL</div>
        </div>

        {showKeyWarning && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
            <div className="font-semibold">Falta la API Key para Widgets</div>
            <div className="text-sm opacity-90">
              Configura <code>VITE_APISPORTS_WIDGET_KEY</code> (o <code>VITE_APISPORTS_KEY</code>) en tu entorno.
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Ligas */}
        <div className="lg:col-span-3">
          <div id="leagues-list" className="rounded-2xl border border-white/10 bg-white/5 p-3 min-h-[520px]">
            <div className="text-sm font-semibold text-white/80 mb-2">Ligas</div>
            <div className="rounded-xl overflow-hidden">
<div className="rounded-2xl border border-white/10 bg-white/5 p-3">
  <div className="mb-2 flex items-baseline justify-between">
    <div className="text-sm font-semibold text-white/90">Ligas esenciales</div>
    <div className="text-[11px] text-white/50">rápido</div>
  </div>

  <div className="grid grid-cols-1 gap-2">
    {LEAGUE_PRESETS.map((l) => {
      const active = l.id === leagueId;
      return (
        <button
          key={`${l.id}-${l.league}`}
          className={
            "w-full rounded-xl border px-3 py-2 text-left transition " +
            (active
              ? "border-emerald-400/40 bg-emerald-400/10"
              : "border-white/10 bg-white/5 hover:bg-white/10")
          }
          onClick={() => setLeagueId(l.id)}
          type="button"
          title={`${l.country} · ${l.league}`}
        >
          <div className="text-[11px] text-white/60">{l.country}</div>
          <div className="text-sm font-medium text-white/90">{l.league}</div>
        </button>
      );
    })}
  </div>

  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
    <div className="mb-2 text-[11px] text-white/60">Filtros</div>
    <div className="flex flex-col gap-2">
      <label className="flex items-center justify-between gap-2 text-[12px] text-white/70">
        <span>Fecha</span>
        <input
          className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-white/90"
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      </label>
      <label className="flex items-center justify-between gap-2 text-[12px] text-white/70">
        <span>Temporada</span>
        <input
          className="w-28 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-white/90"
          type="number"
          min={2000}
          max={2100}
          value={season}
          onChange={(e) => setSeason(Number(e.target.value || new Date().getFullYear()))}
        />
      </label>
      <div className="text-[11px] text-white/40">
        Si una copa no carga, prueba otro año.
      </div>
    </div>
  </div>
</div>

            </div>
        </div>

        {/* Partidos */}
        <div className="lg:col-span-5">
          <div id="games-list" className="rounded-2xl border border-white/10 bg-white/5 p-3 min-h-[520px]">
            <div className="text-sm font-semibold text-white/80 mb-2">Partidos</div>
            <div className="rounded-xl overflow-hidden">
              <api-sports-widget data-type="games" data-league={String(leagueId)} data-season={String(season)} data-date={day}></api-sports-widget>
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 min-h-[220px]">
            <div className="text-sm font-semibold text-white/80 mb-2">Tabla / standings</div>
            <div className="rounded-xl overflow-hidden">
              <div id="standings-content"></div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 min-h-[220px]">
            <div className="text-sm font-semibold text-white/80 mb-2">Equipo / jugadores</div>
            <div className="rounded-xl overflow-hidden">
              <div id="team-content"></div>
            </div>
          </div>

          <div id="game-content" className="rounded-2xl border border-white/10 bg-white/5 p-3 min-h-[320px]">
            <div className="text-sm font-semibold text-white/80 mb-2">Detalle</div>
            <div className="card-body rounded-xl overflow-hidden">
              {/* Un game-id inicial para que el widget renderice algo; luego se reemplaza al seleccionar partido */}
              <api-sports-widget data-type="game" data-game-id="977705"></api-sports-widget>
            </div>
          </div>
        </div>
      </div>

      {/* Config widget (Dynamic Targeting). Debe existir en el DOM para que el resto funcione. */}
      {!!widgetKey && (
        <api-sports-widget
          data-type="config"
          data-sport="football"
          data-key={widgetKey}
          data-lang="es"
          data-theme="grey"
          data-show-error="true"
          data-show-logos="true"
          data-refresh="30"
          data-favorite="true"
          data-standings="true"
          data-team-squad="true"
          data-team-statistics="true"
          data-player-statistics="true"
          data-game-tab="statistics"
          data-target-player="modal"
          data-target-league="#games-list"
          data-target-team="#team-content"
          data-target-game="#game-content .card-body"
          data-target-standings="#standings-content"
          style={{ display: "none" }}
        ></api-sports-widget>
      )}
    </div>
  );
}
