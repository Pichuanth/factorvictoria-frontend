import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Página PARTIDOS (re-hecha): centro de estadísticas con Widgets oficiales de API-FOOTBALL.
// Requiere membresía (o al menos sesión) para acceder.
// Docs/Tutorial: https://www.api-football.com/news/post/how-to-create-a-sports-website-in-just-a-few-minutes-using-widgets

const WIDGET_SCRIPT_SRC = "https://widgets.api-sports.io/3.1.0/widgets.js";

export default function Fixtures() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  // Ajusta esto si tu backend/front maneja planes de otra forma.
  // Mantengo criterio simple: usuario logueado + planId truthy.
  const hasMembership = !!(user && (user.planId || user.plan || user.membership));

  const widgetKey = useMemo(() => {
    // Reusa la key existente si la estás exponiendo en el frontend
    // (puedes setear VITE_APISPORTS_WIDGET_KEY en Vercel para los widgets).
    return (
      import.meta?.env?.VITE_APISPORTS_WIDGET_KEY ||
      import.meta?.env?.VITE_APISPORTS_KEY ||
      ""
    );
  }, []);

  useEffect(() => {
    // Carga del script de widgets (una sola vez)
    if (document.querySelector(`script[src=\"${WIDGET_SCRIPT_SRC}\"]`)) return;

    const s = document.createElement("script");
    s.type = "module";
    s.crossOrigin = "anonymous";
    s.src = WIDGET_SCRIPT_SRC;
    document.head.appendChild(s);

    return () => {
      // No removemos el script en un SPA para evitar recargas innecesarias
    };
  }, []);

  // Bloqueo para no-miembros
  if (!isLoggedIn || !hasMembership) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="text-sm text-white/60">Acceso solo miembros</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Estadísticas avanzadas y widgets PRO
          </h1>
          <p className="mt-2 text-white/70">
            Esta sección está disponible para miembros. Inicia sesión o activa un plan para
            ver ligas, partidos, estadísticas, tablas y fichas de jugadores.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/")}
              className="rounded-full bg-[#E6C464] px-6 py-2 font-semibold text-black hover:opacity-90"
            >
              Comprar membresía
            </button>
            <button
              onClick={() => navigate("/login")}
              className="rounded-full border border-white/15 bg-white/5 px-6 py-2 font-semibold text-white hover:bg-white/10"
            >
              Iniciar sesión
            </button>
          </div>
          <div className="mt-6 text-xs text-white/45">
            Tip: si ya pagaste y no te deja entrar, cierra sesión y vuelve a iniciar.
          </div>
        </div>
      </div>
    );
  }

  const showKeyWarning = !widgetKey;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-white/60">Centro de estadísticas</div>
            <h1 className="mt-1 text-2xl font-semibold text-white">Partidos & Estadísticas</h1>
            <p className="mt-2 text-white/70">
              Selecciona una liga, revisa los partidos del día y abre el detalle con estadísticas.
            </p>
          </div>
          <div className="text-xs text-white/50">
            Widgets oficiales de API-FOOTBALL
          </div>
        </div>

        {showKeyWarning && (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100">
            <div className="font-semibold">Falta la API Key para Widgets</div>
            <div className="mt-1 text-sm text-amber-100/90">
              Configura <span className="font-mono">VITE_APISPORTS_WIDGET_KEY</span> (o
              <span className="font-mono"> VITE_APISPORTS_KEY</span>) en tu entorno.
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Ligas */}
        <section className="lg:col-span-3">
          <div
            id="leagues-list"
            className="rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur lg:sticky lg:top-24"
          >
            <div className="px-2 pb-2 text-sm font-semibold text-white/80">Ligas</div>
            <div className="rounded-2xl bg-black/10 p-2">
              {/* Widget */}
              <api-sports-widget data-type="leagues"></api-sports-widget>
            </div>
          </div>
        </section>

        {/* Partidos */}
        <section className="lg:col-span-5">
          <div
            id="games-list"
            className="rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur"
          >
            <div className="px-2 pb-2 text-sm font-semibold text-white/80">Partidos</div>
            <div className="rounded-2xl bg-black/10 p-2">
              {/* Widget */}
              <api-sports-widget data-type="games"></api-sports-widget>
            </div>
          </div>

          {/* Tablas (opcional) */}
          <div
            id="standings-content"
            className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur"
          >
            <div className="px-2 pb-2 text-sm font-semibold text-white/80">Tabla / standings</div>
            <div className="rounded-2xl bg-black/10 p-2">
              <api-sports-widget data-type="standings"></api-sports-widget>
            </div>
          </div>
        </section>

        {/* Detalle partido */}
        <section className="lg:col-span-4">
          <div
            id="game-content"
            className="rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur lg:sticky lg:top-24"
          >
            <div className="px-2 pb-2 text-sm font-semibold text-white/80">Detalle</div>
            <div className="rounded-2xl bg-black/10 p-2">
              {/*
                data-game-id es fallback. Al seleccionar un partido desde el widget de games,
                el widget de config (abajo) redirige el target automáticamente.
              */}
              <api-sports-widget data-type="game" data-game-id="977705"></api-sports-widget>
            </div>
          </div>

          <div
            id="team-content"
            className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur"
          >
            <div className="px-2 pb-2 text-sm font-semibold text-white/80">Equipo / jugadores</div>
            <div className="rounded-2xl bg-black/10 p-2">
              <api-sports-widget data-type="team"></api-sports-widget>
            </div>
          </div>
        </section>
      </div>

      {/* Config widget (DEBE existir para linking entre widgets) */}
      <api-sports-widget
        data-type="config"
        data-sport="football"
        data-key={widgetKey}
        data-lang="es"
        data-theme="dark"
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
        data-target-game="#game-content"
        data-target-standings="#standings-content"
      ></api-sports-widget>

      <style>{`
        /* Afinamos altura/scroll sin Bootstrap */
        #game-content api-sports-widget { max-height: calc(100vh - 220px); display: block; overflow: auto; }
        #leagues-list api-sports-widget { max-height: calc(100vh - 220px); display: block; overflow: auto; }
        #games-list api-sports-widget { display: block; }
        #standings-content api-sports-widget, #team-content api-sports-widget { display:block; max-height: 55vh; overflow:auto; }
      `}</style>
    </div>
  );
}
