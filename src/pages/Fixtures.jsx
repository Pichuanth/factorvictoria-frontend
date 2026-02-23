import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const WIDGET_SCRIPT_SRC = "https://widgets.api-sports.io/3.1.0/widgets.js";

export default function Fixtures() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  // Solo miembros (ajusta si tu “membresía” vive en otra propiedad)
  const hasMembership = !!(user && (user.planId || user.plan || user.membership));

  // Si quieres ocultar esta pestaña a NO miembros:
  useEffect(() => {
    if (!isLoggedIn || !hasMembership) navigate("/app"); // o "/app/inicio"
  }, [isLoggedIn, hasMembership, navigate]);

  const widgetKey = useMemo(() => {
    return (
      import.meta.env.VITE_APISPORTS_WIDGET_KEY ||
      import.meta.env.VITE_APISPORTS_KEY ||
      ""
    );
  }, []);

  // Carga script 1 sola vez
  useEffect(() => {
    if (!widgetKey) return;
    if (document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`)) return;

    const s = document.createElement("script");
    s.src = WIDGET_SCRIPT_SRC;
    s.type = "module";
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }, [widgetKey]);

  if (!isLoggedIn || !hasMembership) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-white/60 mb-2">Centro de estadísticas</div>
            <h1 className="text-2xl font-semibold text-white">Partidos &amp; Estadísticas</h1>
            <p className="text-white/70 mt-2">
              Selecciona una liga, revisa los partidos del día y abre el detalle con estadísticas.
            </p>
          </div>
          <div className="text-xs text-white/50 mt-1">Widgets oficiales de API-FOOTBALL</div>
        </div>
      </div>

      {!widgetKey && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100 mb-6">
          <div className="font-semibold">Falta la API Key para Widgets</div>
          <div className="text-sm opacity-90">
            Configura <b>VITE_APISPORTS_WIDGET_KEY</b> (o <b>VITE_APISPORTS_KEY</b>) en Vercel y redeploy.
          </div>
        </div>
      )}

      {/* CONFIG: esto es lo que hace que los widgets “se hablen” */}
      {!!widgetKey && (
        <api-sports-widget
          data-type="config"
          data-sport="football"
          data-key={widgetKey}
          data-lang="es"
          data-theme="dark"
          data-show-error="true"
          data-show-logos="true"
          data-refresh="180"
          data-favorite="true"
          data-standings="true"
          data-team-squad="true"
          data-team-statistics="true"
          data-player-statistics="true"
          data-tab="games"
          data-game-tab="statistics"
          data-target-player="modal"
          data-target-league="#games-list"
          data-target-team="#team-content"
          data-target-game="#game-content"
          data-target-standings="#standings-content"
        ></api-sports-widget>
      )}

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm text-white/70 mb-2">Ligas</div>
            <div className="min-h-[420px]">
              {!!widgetKey && <api-sports-widget data-type="leagues"></api-sports-widget>}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div id="games-list" className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm text-white/70 mb-2">Partidos</div>
            <div className="min-h-[420px]">
              {!!widgetKey && <api-sports-widget data-type="games"></api-sports-widget>}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm text-white/70 mb-2">Tabla / standings</div>
            <div id="standings-content" className="min-h-[210px]" />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm text-white/70 mb-2">Equipo / jugadores</div>
            <div id="team-content" className="min-h-[210px]" />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm text-white/70 mb-2">Detalle</div>
            <div id="game-content" className="min-h-[260px]">
              {/* opcional: un game fijo para que siempre haya algo al cargar */}
              {!!widgetKey && (
                <api-sports-widget data-type="game"></api-sports-widget>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-white/40 mt-4">Widgets cargados.</div>
    </div>
  );
}