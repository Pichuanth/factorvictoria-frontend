import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

// Página PARTIDOS: centro de estadísticas con Widgets oficiales de API-FOOTBALL.
// Requiere membresía (o al menos sesión) para acceder.
// Tutorial: https://www.api-football.com/news/post/how-to-create-a-sports-website-in-just-a-few-minutes-using-widgets

const WIDGET_SCRIPT_SRC = "https://widgets.api-sports.io/3.1.0/widgets.js";

const ALLOWED_COUNTRIES = [
  "Argentina",
  "Brazil",
  "Chile",
  "Colombia",
  "Mexico",
  "Spain",
  "England",
  "Italy",
  "Germany",
  "Portugal",
  "France",
];

function setupLeaguesCountryFilter() {
  // Filtra visualmente el listado de países/ligas para que SOLO queden los países allowlist.
  // Importante: esto NO cambia la data que descarga el widget (eso depende de config del widget),
  // pero sí reduce el ruido visual y hace la UI más usable, especialmente en móvil.
  if (window.__FV_leaguesFilterSetup) return;
  window.__FV_leaguesFilterSetup = true;

  const allowed = new Set(ALLOWED_COUNTRIES.map((c) => c.toLowerCase()));

  const isCountryLabel = (txt) => {
    const t = (txt || "").trim();
    if (!t) return false;
    if (t.length > 30) return false;
    // solo letras/espacios/guiones (evita nombres largos de ligas)
    if (!/^[\p{L}\s-]+$/u.test(t)) return false;
    // muchos widgets muestran países con Title Case; esto es un filtro suave
    return true;
  };

  const hideCountryGroup = (labelEl) => {
    // Intentamos ocultar el bloque completo del país (header + leagues)
    const group =
      labelEl.closest("li") ||
      labelEl.closest("[class*='country']") ||
      labelEl.closest("[class*='Country']") ||
      labelEl.closest("div");
    (group || labelEl).style.display = "none";
  };

  const tryFilter = () => {
    const root = document.getElementById("leagues-list");
    if (!root) return;

    // 1) Encuentra candidatos a “nombre de país” dentro del widget
    const candidates = Array.from(
      root.querySelectorAll(
        "[class*='country'], [class*='Country'], h1, h2, h3, h4, h5, strong, span, li, div"
      )
    );

    for (const el of candidates) {
      const raw = (el.textContent || "").trim();
      if (!isCountryLabel(raw)) continue;

      const key = raw.toLowerCase();
      // Si el texto coincide exacto con un país y NO está permitido, lo ocultamos.
      // Si coincide con uno permitido, lo dejamos.
      if (allowed.has(key)) continue;

      // Heurística: solo ocultar cuando “parece” un país (evita ocultar ligas cortas)
      // - En muchos widgets el país aparece aislado en una línea/header.
      const hasFewChildren = el.children?.length <= 2;
      const isShortSingleLine = raw.split(/\s+/).length <= 3;
      const looksLikeHeader =
        /country/i.test(el.className || "") ||
        ["H1", "H2", "H3", "H4", "H5", "STRONG"].includes(el.tagName);

      if (looksLikeHeader || (hasFewChildren && isShortSingleLine)) {
        hideCountryGroup(el);
      }
    }
  };

  // Observamos cambios porque el widget pinta async (SPA + script externo).
  const root = document.getElementById("leagues-list");
  const obsTarget = root || document.body;

  const observer = new MutationObserver(() => {
    tryFilter();
  });

  observer.observe(obsTarget, { childList: true, subtree: true });

  // Primeras pasadas
  tryFilter();
  setTimeout(tryFilter, 250);
  setTimeout(tryFilter, 800);
}

function setupWidgetUiPrune() {
  // Oculta secciones/tabs que no aportan (sobre todo en móvil):
  // - “Tabla / Standings”
  // - “Equipo / Jugadores / Squad / Players”
  // No tocamos la lógica interna del widget: solo ocultamos elementos del DOM cuando aparezcan.
  if (window.__FV_widgetUiPruneSetup) return;
  window.__FV_widgetUiPruneSetup = true;

  const SHOULD_HIDE = [
    "tabla",
    "standings",
    "equipo",
    "jugadores",
    "players",
    "squad",
    "alineación",
    "lineup",
  ];

  const shouldHide = (txt) => {
    const t = (txt || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!t) return false;
    return SHOULD_HIDE.some((k) => t === k || t.includes(k));
  };

  const prune = () => {
    const scope = document.querySelector("#leagues-list, #games-list, #game-content") || document.body;

    const clickable = Array.from(scope.querySelectorAll("button, a, li, span, div"))
      .filter((el) => {
        const txt = (el.textContent || "").trim();
        if (!txt) return false;
        // Evita borrar contenedores grandes; prioriza elementos “tipo botón/tab”
        const isInteractive =
          el.tagName === "BUTTON" ||
          el.tagName === "A" ||
          (el.getAttribute?.("role") || "").toLowerCase().includes("tab") ||
          (el.className || "").toString().toLowerCase().includes("tab");
        return isInteractive || txt.length <= 20;
      });

    for (const el of clickable) {
      const txt = (el.textContent || "").trim();
      if (!shouldHide(txt)) continue;

      // Oculta el tab/botón y, si corresponde, el contenedor cercano.
      el.style.display = "none";

      const wrap =
        el.closest("[role='tab']") ||
        el.closest("[class*='tab']") ||
        el.closest("li") ||
        el.closest("button") ||
        null;
      if (wrap && wrap !== el) wrap.style.display = "none";
    }
  };

  const observer = new MutationObserver(() => prune());
  observer.observe(document.body, { childList: true, subtree: true });

  prune();
  setTimeout(prune, 250);
  setTimeout(prune, 800);
}



function setupGamesCountryFilter() {
  // Filtra visualmente la lista de “Partidos” para ocultar ligas cuyo país NO esté en allowlist.
  // Esto reduce el ruido (Japón/Australia/etc) y mejora el scroll.
  if (window.__FV_gamesCountryFilterSetup) return;
  window.__FV_gamesCountryFilterSetup = true;

  const allowed = new Set(ALLOWED_COUNTRIES.map((c) => c.toLowerCase()));

  const parseCountryLeague = (txt) => {
    const t = (txt || "").replace(/\s+/g, " ").trim();
    if (!t) return null;
    if (t.length > 80) return null;
    const m = t.match(/^([\p{L}\s-]{2,})\s*:\s*(.+)$/u);
    if (!m) return null;
    const country = (m[1] || "").trim();
    const league = (m[2] || "").trim();
    if (!country || !league) return null;
    // Evita falsos positivos donde el “country” en realidad no es país (muy largo o con números)
    if (country.length > 30) return null;
    if (/\d/.test(country)) return null;
    return { country, league };
  };

  const hideLeagueSection = (headerEl) => {
    // Intentamos ocultar el bloque completo de esa liga (header + partidos)
    const block =
      headerEl.closest("li") ||
      headerEl.closest("[class*='league']") ||
      headerEl.closest("[class*='League']") ||
      headerEl.closest("[class*='competition']") ||
      headerEl.closest("[class*='Competition']") ||
      headerEl.closest("div");
    (block || headerEl).style.display = "none";
  };

  const filterGames = () => {
    const root = document.getElementById("games-list");
    if (!root) return;

    const candidates = Array.from(
      root.querySelectorAll("button, a, h1, h2, h3, h4, strong, span, div, li")
    );

    for (const el of candidates) {
      const raw = (el.textContent || "").trim();
      const parsed = parseCountryLeague(raw);
      if (!parsed) continue;

      const key = parsed.country.toLowerCase();
      if (allowed.has(key)) continue;

      // El header de liga suele ser clickeable o tener estilo de “fila”
      const isInteractive =
        el.tagName === "BUTTON" ||
        el.tagName === "A" ||
        (el.getAttribute?.("role") || "").toLowerCase().includes("button") ||
        (el.className || "").toString().toLowerCase().includes("header") ||
        (el.className || "").toString().toLowerCase().includes("league");

      // Heurística: ocultamos sólo si parece encabezado de liga
      if (isInteractive || raw.split(":").length === 2) {
        hideLeagueSection(el);
      }
    }
  };

  const observer = new MutationObserver(() => filterGames());
  observer.observe(document.body, { childList: true, subtree: true });

  filterGames();
  setTimeout(filterGames, 250);
  setTimeout(filterGames, 800);
}

function setupDefaultDetailSelection() {
  // Evita que el panel “Detalle” quede mostrando cosas viejas (World Cup 2022).
  // Intentamos auto-seleccionar una liga más actual (Champions / ligas top).
  if (window.__FV_defaultDetailSetup) return;
  window.__FV_defaultDetailSetup = true;

  const PREFERRED = [
    "UEFA Champions League",
    "Champions League",
    "Premier League",
    "La Liga",
    "Serie A",
    "Bundesliga",
    "Ligue 1",
    "Primeira Liga",
    "Liga MX",
    "Serie A Brazil",
    "Brasileirão",
    "Liga Profesional",
    "Primera División",
    "Primera A",
  ];

  const tryClick = () => {
    const scopes = [
      document.getElementById("leagues-list"),
      document.getElementById("games-list"),
      document.getElementById("game-content"),
      document.body,
    ].filter(Boolean);

    const all = [];
    for (const s of scopes) {
      all.push(...Array.from(s.querySelectorAll("button, a, li, div, span, strong")));
    }

    for (const pref of PREFERRED) {
      const prefLc = pref.toLowerCase();
      const el = all.find((x) => ((x.textContent || "").toLowerCase().includes(prefLc)));
      if (!el) continue;

      // Click en el elemento más “interactivo” posible
      const clickable = el.closest("button, a, li") || el;
      try {
        clickable.click();
        return true;
      } catch (_) {
        // no-op
      }
    }
    return false;
  };

  // Varias pasadas porque los widgets cargan async
  setTimeout(tryClick, 400);
  setTimeout(tryClick, 900);
  setTimeout(tryClick, 1600);
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

    (async () => {
      try {
        await ensureWidgetScriptLoaded();

    // Filtra países para que el widget de ligas quede liviano
    setupLeaguesCountryFilter();

    // Oculta tabs/paneles que no aportan (Tabla/Equipo/Jugadores)
    setupWidgetUiPrune();

    // Filtra el listado central de Partidos (oculta ligas de países fuera de allowlist)
    setupGamesCountryFilter();

    // Ajusta detalle por defecto (evita World Cup viejo)
    setupDefaultDetailSelection();
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
          data-standings="false"
          data-team-squad="false"
          data-team-statistics="false"
          data-player-statistics="false"
          data-game-tab="statistics"
          data-target-league="#games-list"
          data-target-game="#game-content .card-body"
          style={{ display: "none" }}
        ></api-sports-widget>
      )}
    </div>
  );
}
