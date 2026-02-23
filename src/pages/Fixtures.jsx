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
  // Filtra el panel izquierdo (países) SIN romper el widget:
  // - No removemos nodos (eso rompe expansión/favoritos).
  // - Solo aplicamos display:none a filas de países fuera de allowlist.
  if (window.__FV_leaguesFilterSetup) return;
  window.__FV_leaguesFilterSetup = true;

  const allowed = new Set(ALLOWED_COUNTRIES.map((c) => c.toLowerCase()));

  const normalize = (s) =>
    (s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const extractCountry = (rowEl) => {
    // En el widget el texto suele venir como: "Chile 5" (con contador al final)
    const raw = normalize(rowEl?.textContent);
    if (!raw) return "";
    // quita contadores al final: "Chile 5" => "Chile"
    const noCount = raw.replace(/\s+\d+\s*$/, "").trim();
    // algunos items pueden traer símbolos/estrella/arrow; nos quedamos con palabras
    const cleaned = noCount.replace(/[^\p{L}\s-]/gu, "").replace(/\s+/g, " ").trim();
    // country debería ser corto
    if (cleaned.length > 30) return "";
    return cleaned;
  };

  const filter = () => {
    const root = document.getElementById("leagues-list");
    if (!root) return;

    // Intento conservador: filas "clickeables" suelen ser <li>
    const rows = Array.from(root.querySelectorAll("li")).filter((li) => {
      // suele existir una bandera <img> dentro del row
      const hasFlag = !!li.querySelector("img");
      const t = normalize(li.textContent);
      // evita contenedores grandes vacíos
      return hasFlag && t.length > 0 && t.length < 80;
    });

    for (const row of rows) {
      const country = extractCountry(row);
      if (!country) continue;

      const key = country.toLowerCase();
      // si NO está permitido, ocultamos la fila
      if (!allowed.has(key)) {
        row.style.display = "none";
        row.setAttribute("data-fv-hidden-country", "1");
      } else {
        // si está permitido, la dejamos visible
        if (row.getAttribute("data-fv-hidden-country") === "1") {
          row.style.display = "";
          row.removeAttribute("data-fv-hidden-country");
        }
      }
    }
  };

  // Debounce para no pelear con eventos internos (favoritos/expand)
  let t = null;
  const schedule = () => {
    if (t) clearTimeout(t);
    t = setTimeout(filter, 80);
  };

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.body, { childList: true, subtree: true });

  filter();
  setTimeout(filter, 250);
  setTimeout(filter, 900);
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
  // Filtra el panel central (Partidos) sin romper el widget:
  // - Solo ocultamos (display:none) bloques de liga fuera de allowlist.
  // - Además limitamos a máximo 5 ligas por país (priorizando ligas "grandes").
  if (window.__FV_gamesCountryFilterSetup) return;
  window.__FV_gamesCountryFilterSetup = true;

  const allowedCountries = new Set(ALLOWED_COUNTRIES.map((c) => c.toLowerCase()));
  const MAX_LEAGUES_PER_COUNTRY = 5;

  // Top leagues por país (match flexible por "includes")
  const TOP_LEAGUES = {
    argentina: ["liga profesional", "copa", "primera nacional", "supercopa", "reserva"],
    brazil: ["serie a", "serie b", "copa do brasil", "paulista", "carioca"],
    chile: ["primera", "copa chile", "primera b", "supercopa", "femen"],
    colombia: ["primera a", "copa", "primera b", "superliga", "femen"],
    mexico: ["liga mx", "liga premier", "expans", "copa", "femen"],
    spain: ["la liga", "copa del rey", "segunda", "supercopa", "primera"],
    england: ["premier league", "fa cup", "championship", "efl", "community"],
    italy: ["serie a", "coppa italia", "serie b", "supercoppa", "primavera"],
    germany: ["bundesliga", "dfb", "2. bundesliga", "supercup", "3. liga"],
    portugal: ["primeira", "taça", "liga 2", "supertaça", "liga 3"],
    france: ["ligue 1", "coupe", "ligue 2", "troph", "national"],
  };

  const normalize = (s) =>
    (s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const parseCountryLeague = (txt) => {
    const t = normalize(txt);
    // "Mexico : Liga MX"
    const m = t.match(/^([\p{L}\s-]{2,})\s*:\s*(.+)$/u);
    if (!m) return null;
    const country = normalize(m[1]);
    const league = normalize(m[2]);
    if (!country || !league) return null;
    if (country.length > 30) return null;
    if (/\d/.test(country)) return null;
    return { country, league };
  };

  const scoreLeague = (countryKey, leagueName) => {
    const list = TOP_LEAGUES[countryKey] || [];
    const l = leagueName.toLowerCase();
    // score 0..N (más alto = mejor)
    for (let i = 0; i < list.length; i++) {
      if (l.includes(list[i])) return 100 - i; // preferimos el orden del array
    }
    return 0;
  };

  const filterGames = () => {
    const root = document.getElementById("games-list");
    if (!root) return;

    // Heurística: cada bloque de liga suele ser un <li> grande con header "Country : League"
    const blocks = Array.from(root.querySelectorAll(":scope > li, :scope > div")).filter((b) => {
      const t = normalize(b.textContent);
      return t.includes(":") && t.length < 220;
    });

    // Primero agrupamos por país para aplicar MAX 5
    const parsedBlocks = [];
    for (const b of blocks) {
      // buscar el primer texto con ":" dentro del bloque
      const headerEl =
        b.querySelector("button, a, strong, h1, h2, h3, h4, span, div") || b;
      const headerTxt = normalize(headerEl.textContent);
      const parsed = parseCountryLeague(headerTxt);
      if (!parsed) continue;
      parsedBlocks.push({ block: b, headerEl, ...parsed });
    }

    const perCountry = new Map();
    for (const item of parsedBlocks) {
      const cKey = item.country.toLowerCase();
      if (!perCountry.has(cKey)) perCountry.set(cKey, []);
      perCountry.get(cKey).push(item);
    }

    for (const [countryKey, items] of perCountry.entries()) {
      // País no permitido => ocultar todo
      if (!allowedCountries.has(countryKey)) {
        for (const it of items) {
          it.block.style.display = "none";
          it.block.setAttribute("data-fv-hidden-league", "1");
        }
        continue;
      }

      // País permitido => elegimos top 5 por score (y si empatan, por orden DOM)
      const scored = items
        .map((it, idx) => ({ it, idx, score: scoreLeague(countryKey, it.league) }))
        .sort((a, b) => (b.score - a.score) || (a.idx - b.idx));

      const keep = new Set(scored.slice(0, MAX_LEAGUES_PER_COUNTRY).map((x) => x.it.block));

      for (const it of items) {
        if (keep.has(it.block)) {
          if (it.block.getAttribute("data-fv-hidden-league") === "1") {
            it.block.style.display = "";
            it.block.removeAttribute("data-fv-hidden-league");
          }
        } else {
          it.block.style.display = "none";
          it.block.setAttribute("data-fv-hidden-league", "1");
        }
      }
    }
  };

  let t = null;
  const schedule = () => {
    if (t) clearTimeout(t);
    t = setTimeout(filterGames, 80);
  };

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.body, { childList: true, subtree: true });

  filterGames();
  setTimeout(filterGames, 250);
  setTimeout(filterGames, 900);
}


function setupDefaultDetailSelection() {
  // Evita que el panel “Detalle” quede en World Cup 2022.
  // Estrategia segura:
  // 1) Esperar a que exista #games-list con ligas visibles (ya filtradas).
  // 2) Buscar una liga preferida (Champions / ligas top) dentro de #games-list.
  // 3) Clickear la PRIMERA fila de partido de esa liga (no solo el header), para forzar carga de detalle.
  //
  // IMPORTANTE: correr 1 vez por render/refresco (sin spamear clicks).
  if (window.__FV_defaultDetailSetup) return;
  window.__FV_defaultDetailSetup = true;

  const PREFERRED = [
    "UEFA Champions League",
    "Champions League",
    "England : Premier League",
    "Premier League",
    "Spain : La Liga",
    "La Liga",
    "Italy : Serie A",
    "Serie A",
    "Germany : Bundesliga",
    "Bundesliga",
    "France : Ligue 1",
    "Ligue 1",
    "Portugal : Primeira Liga",
    "Primeira Liga",
    "Chile",
    "Mexico",
    "Brazil",
    "Argentina",
    "Colombia",
  ].map((x) => x.toLowerCase());

  const normalize = (s) =>
    (s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const isWorldCupDetail = () => {
    const detail = document.getElementById("game-content") || document.body;
    const t = normalize(detail.textContent).toLowerCase();
    return t.includes("world : world cup") || t.includes("world cup");
  };

  const trySelect = () => {
    if (!isWorldCupDetail()) return false;

    const root = document.getElementById("games-list");
    if (!root) return false;

    const blocks = Array.from(root.querySelectorAll(":scope > li, :scope > div")).filter((b) => {
      if (b.style.display === "none") return false;
      const t = normalize(b.textContent);
      return t.includes(":") && t.length < 240;
    });

    // Buscar primer bloque que matchee preferidas
    for (const pref of PREFERRED) {
      const b = blocks.find((x) => normalize(x.textContent).toLowerCase().includes(pref));
      if (!b) continue;

      // Dentro del bloque, intenta encontrar una fila de partido clickeable
      const matchRow =
        b.querySelector("a, button, [role='button'], li, div") || null;

      // Preferimos algo que tenga dos equipos o un score; heurística por presencia de números o 'FIN'
      const candidates = Array.from(b.querySelectorAll("a, button, [role='button'], li, div"))
        .filter((el) => {
          const t = normalize(el.textContent);
          if (!t || t.length > 120) return false;
          return /\bFIN\b|\bFT\b|\d\s*-\s*\d/.test(t) || t.split(" ").length >= 2;
        });

      const clickable = candidates.find((el) => el !== b) || matchRow;
      if (!clickable) continue;

      try {
        clickable.click();
        return true;
      } catch (_) {
        // no-op
      }
    }

    return false;
  };

  // Debounce + varias pasadas porque el widget carga async y además refresca (data-refresh)
  let attempts = 0;
  const tick = () => {
    attempts += 1;
    if (attempts > 8) return;
    const ok = trySelect();
    if (!ok) setTimeout(tick, 450);
  };

  setTimeout(tick, 600);
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
