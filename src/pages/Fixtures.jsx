import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

// Widgets oficiales API-SPORTS (API-FOOTBALL)
// Doc/Tutorial: https://www.api-football.com/news/post/how-to-create-a-sports-website-in-just-a-few-minutes-using-widgets
const WIDGET_SCRIPT_SRC = "https://widgets.api-sports.io/3.1.0/widgets.js";

export default function Fixtures() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  // Ajusta este criterio si tu backend maneja planes distinto.
  const hasMembership = !!(user && (user.planId || user.plan || user.membership));

  // OJO: los widgets corren en el navegador, por eso la key debe estar disponible en el front.
  // Recomendación: usa una API-KEY dedicada para Widgets y restringida por dominio en el dashboard.
  const widgetKey = useMemo(() => {
    return (
      import.meta?.env?.VITE_APISPORTS_WIDGET_KEY ||
      import.meta?.env?.VITE_APISPORTS_KEY ||
      ""
    );
  }, []);

  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    // Si no está logueado o no tiene membresía, no cargamos nada (y opcionalmente redirigimos).
    // Esto evita gastar recursos y evita que se vea el módulo.
    if (!isLoggedIn) return;
    if (!hasMembership) return;

    // Carga del script (ES Module). Si no es type="module", NO funciona.
    const existing = document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`);
    if (existing) {
      setScriptReady(true);
      return;
    }

    const s = document.createElement("script");
    s.type = "module";
    s.crossOrigin = "anonymous";
    s.src = WIDGET_SCRIPT_SRC;
    s.onload = () => setScriptReady(true);
    s.onerror = () => setScriptReady(false);
    document.head.appendChild(s);

    return () => {
      // no removemos el script para evitar re-cargas entre rutas
    };
  }, [isLoggedIn, hasMembership]);

  // Paywall elegante (y evita que se vea la pestaña a no-miembros)
  if (!isLoggedIn) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="text-sm text-white/70">Acceso restringido</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">Partidos & Estadísticas</h1>
          <p className="mt-2 text-white/70">
            Inicia sesión para acceder al centro de estadísticas.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              className="rounded-xl bg-[#E6C464] px-4 py-2 font-medium text-black"
              onClick={() => navigate("/")}
            >
              Ir a Inicio
            </button>
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-medium text-white"
              onClick={() => navigate("/login")}
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasMembership) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="text-sm text-white/70">Bloqueado por plan</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">Partidos & Estadísticas</h1>
          <p className="mt-2 text-white/70">
            Este módulo es exclusivo para miembros. Activa tu plan para desbloquear widgets con
            ligas, partidos, standings, estadísticas de equipo/jugadores y detalle del partido.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              className="rounded-xl bg-[#E6C464] px-4 py-2 font-medium text-black"
              onClick={() => navigate("/")}
            >
              Ver planes
            </button>
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-medium text-white"
              onClick={() => navigate("/comparador")}
            >
              Volver al comparador
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay key, mostramos aviso (pero dejamos la UI lista).
  const showMissingKey = !widgetKey;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm text-white/60">Centro de estadísticas</div>
            <h1 className="mt-1 text-2xl font-semibold text-white">Partidos & Estadísticas</h1>
            <p className="mt-2 text-white/70">
              Selecciona una liga, revisa los partidos del día y abre el detalle con estadísticas.
            </p>
          </div>
          <div className="text-xs text-white/50">Widgets oficiales de API-FOOTBALL</div>
        </div>

        {showMissingKey && (
          <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-amber-100">
            <div className="font-semibold">Falta la API Key para Widgets</div>
            <div className="mt-1 text-sm text-amber-100/80">
              Configura <span className="font-mono">VITE_APISPORTS_WIDGET_KEY</span> (o{" "}
              <span className="font-mono">VITE_APISPORTS_KEY</span>) en Vercel / tu .env.
              <br />
              Luego haz redeploy.
            </div>
          </div>
        )}
      </div>

      {/* Layout principal */}
      <div className="mt-6 grid grid-cols-12 gap-4">
        {/* Ligas */}
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="px-4 py-3 text-sm font-semibold text-white/80">Ligas</div>
            <div className="border-t border-white/10 p-2">
              <api-sports-widget data-type="leagues"></api-sports-widget>
            </div>
          </div>
        </div>

        {/* Partidos */}
        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="px-4 py-3 text-sm font-semibold text-white/80">Partidos</div>
            <div className="border-t border-white/10 p-2">
              {/* Target league -> games */}
              <div id="games-list">
                <api-sports-widget data-type="games"></api-sports-widget>
              </div>
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Tabla / standings */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="px-4 py-3 text-sm font-semibold text-white/80">Tabla / standings</div>
            <div className="border-t border-white/10 p-2">
              <div id="standings-content" className="min-h-[120px]"></div>
            </div>
          </div>

          {/* Equipo / jugadores */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="px-4 py-3 text-sm font-semibold text-white/80">Equipo / jugadores</div>
            <div className="border-t border-white/10 p-2">
              <div id="team-content" className="min-h-[120px]"></div>
            </div>
          </div>

          {/* Detalle */}
          <div id="game-content" className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="px-4 py-3 text-sm font-semibold text-white/80">Detalle</div>
            {/* OJO: el config apunta a "#game-content .card-body" */}
            <div className="card-body border-t border-white/10 p-2">
              {/* Widget base (opcional). Luego se reemplaza dinámicamente al seleccionar un game */}
              <api-sports-widget data-type="game"></api-sports-widget>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración global para Dynamic Targeting (debe existir una vez) */}
      {!showMissingKey && (
        <api-sports-widget
          data-type="config"
          data-sport="football"
          data-key={widgetKey}
          data-lang="es"
          data-theme="grey"
          data-show-error="false"
          data-show-logos="true"
          data-refresh="20"
          data-favorite="true"
          data-player-trophies="true"
          data-standings="true"
          data-player-injuries="true"
          data-team-squad="true"
          data-team-statistics="true"
          data-player-statistics="true"
          data-tab="games"
          data-game-tab="statistics"
          data-target-player="modal"
          data-target-league="#games-list"
          data-target-team="#team-content"
          data-target-game="#game-content .card-body"
          data-target-standings="#standings-content"
        ></api-sports-widget>
      )}

      {/* Nota técnica */}
      <div className="mt-6 text-xs text-white/40">
        {scriptReady ? (
          <span>Widgets cargados.</span>
        ) : (
          <span>
            Cargando widgets… (si se queda así, revisa consola del navegador y la API KEY).
          </span>
        )}
      </div>
    </div>
  );
}
