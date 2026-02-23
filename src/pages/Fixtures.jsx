import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

// Página PARTIDOS: centro de estadísticas con Widgets oficiales de API-FOOTBALL.
// Requiere membresía (o al menos sesión) para acceder.
// Tutorial: https://www.api-football.com/news/post/how-to-create-a-sports-website-in-just-a-few-minutes-using-widgets

const WIDGET_SCRIPT_SRC = "https://widgets.api-sports.io/3.1.0/widgets.js";

// Reducir ruido visual: mostramos solo países/ligas principales.
// OJO: Esto filtra la UI del widget (no reduce el payload que descarga API-SPORTS).
const ALLOWED_COUNTRIES = [
  "Argentina",
  "Brasil",
  "Brazil",
  "Chile",
  "Colombia",
  "Mexico",
  "México",
  "España",
  "Spain",
  "Inglaterra",
  "England",
  "Italia",
  "Italy",
  "Alemania",
  "Germany",
  "Portugal",
  "Francia",
  "France",
];

function _norm(str) {
  return (str || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function installAllowedCountriesFilter() {
  const allow = new Set(ALLOWED_COUNTRIES.map(_norm));
  const leaguesWidget = document.querySelector(
    '#leagues-list api-sports-widget[data-type="leagues"]'
  );
  if (!leaguesWidget) return () => {};

  const tryFilter = () => {
    const root = leaguesWidget.shadowRoot || leaguesWidget;
    if (!root) return;

    const candidates = root.querySelectorAll("li, a, button, div");
    if (!candidates || candidates.length === 0) return;

    candidates.forEach((el) => {
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "svg" || tag === "path") return;
      const txt = _norm(el.textContent);
      if (!txt) return;

      const isCountryLike = txt.length <= 20 && txt.split(" ").length <= 3;
      if (isCountryLike) {
        const ok = Array.from(allow).some(
          (a) => txt === a || txt.startsWith(a + " ") || txt.includes(a)
        );
        if (!ok) el.style.display = "none";
      }
    });
  };

  const root = leaguesWidget.shadowRoot || leaguesWidget;
  const obs = new MutationObserver(() => tryFilter());
  try {
    obs.observe(root, { childList: true, subtree: true });
  } catch (_) {
    // no-op
  }

  tryFilter();
  const t1 = setTimeout(tryFilter, 300);
  const t2 = setTimeout(tryFilter, 900);

  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    try {
      obs.disconnect();
    } catch (_) {
      // no-op
    }
  };
}

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

function waitForWidgetConfig(maxTries = 30) {
  return new Promise((resolve) => {
    let tries = 0;
    const tick = () => {
      tries += 1;
      const cfg = document.querySelector('api-sports-widget[data-type="config"]');
      if (cfg) return resolve(true);
      if (tries >= maxTries) return resolve(false);
      setTimeout(tick, 100);
    };
    tick();
  });
}

export default function Fixtures() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

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
    let uninstallFilter = null;

    (async () => {
      try {
        await ensureWidgetScriptLoaded();
        if (cancelled) return;

        await waitForWidgetConfig(30);
        if (cancelled) return;

        // Espera un tick para asegurar que el DOM esté montado
        setTimeout(() => {
          if (cancelled) return;
          refreshApiSportsWidgets();

          // Filtra países del listado de Ligas (UI)
          uninstallFilter = installAllowedCountriesFilter();
        }, 50);
      } catch (e) {
        // Si falla la carga del script, igual dejamos la UI (con mensaje).
        console.error("[WIDGETS] Error cargando script:", e);
      }
    })();

    return () => {
      cancelled = true;
      if (typeof uninstallFilter === "function") uninstallFilter();
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
              <api-sports-widget data-type="leagues"></api-sports-widget>
            </div>
          </div>
        </div>

        {/* Partidos */}
        <div className="lg:col-span-5">
          <div id="games-list" className="rounded-2xl border border-white/10 bg-white/5 p-3 min-h-[520px]">
            <div className="text-sm font-semibold text-white/80 mb-2">Partidos</div>
            <div className="rounded-xl overflow-hidden">
              <api-sports-widget data-type="games"></api-sports-widget>
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
