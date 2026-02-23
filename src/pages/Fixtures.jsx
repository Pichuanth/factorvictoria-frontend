import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

// ✅ OJO: singular "widget.js"
const WIDGET_SCRIPT_SRC = "https://widgets.api-sports.io/3.1.0/widgets.js";

export default function Fixtures() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  // Ajusta si tu user maneja plan distinto
  const hasMembership = !!(isLoggedIn && user && (user.planId || user.plan || user.membership));

  // Solo miembros (como pediste)
  useEffect(() => {
    if (!hasMembership) navigate("/", { replace: true });
  }, [hasMembership, navigate]);

  const widgetKey = useMemo(() => {
    return (
      import.meta?.env?.VITE_APISPORTS_WIDGET_KEY ||
      import.meta?.env?.VITE_APISPORTS_KEY ||
      ""
    );
  }, []);

  useEffect(() => {
    if (!hasMembership) return;
    if (!widgetKey) return;

    // Cargar script UNA sola vez
    const already = document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`);
    if (already) return;

    const s = document.createElement("script");
    s.src = WIDGET_SCRIPT_SRC;
    s.type = "module";
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }, [hasMembership, widgetKey]);

  if (!hasMembership) return null;

  if (!widgetKey) {
    return (
      <div style={{ padding: 24, color: "#fff" }}>
        Falta la API Key para Widgets. Configura VITE_APISPORTS_WIDGET_KEY (o VITE_APISPORTS_KEY).
      </div>
    );
  }

  return (
    <div className="pageWrap">
      <div className="pageHeader">
        <div>
          <div className="muted">Centro de estadísticas</div>
          <h1>Partidos &amp; Estadísticas</h1>
          <div className="muted">
            Selecciona una liga, revisa los partidos del día y abre el detalle con estadísticas.
          </div>
        </div>
        <div className="muted">Widgets oficiales de API-FOOTBALL</div>
      </div>

      {/* ✅ Config widget (obligatorio) */}
      <api-sports-widget
        data-type="config"
        data-sport="football"
        data-key={widgetKey}
        data-lang="es"
        data-theme="dark"
        data-show-error="true"
        data-show-logos="true"
        data-refresh="60"
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
        data-target-game="#game-content .card-body"
        data-target-standings="#standings-content"
      ></api-sports-widget>

      <div className="grid3">
        <div className="cardBox">
          <div className="cardTitle">Ligas</div>
          <div className="cardBody p0">
            <api-sports-widget data-type="leagues"></api-sports-widget>
          </div>
        </div>

        <div className="cardBox" id="games-list">
          <div className="cardTitle">Partidos</div>
          <div className="cardBody p0">
            <api-sports-widget data-type="games"></api-sports-widget>
          </div>
        </div>

        <div className="stack">
          <div className="cardBox">
            <div className="cardTitle">Tabla / standings</div>
            <div className="cardBody p0">
              <div id="standings-content"></div>
            </div>
          </div>

          <div className="cardBox">
            <div className="cardTitle">Equipo / jugadores</div>
            <div className="cardBody p0">
              <div id="team-content"></div>
            </div>
          </div>

          <div className="cardBox" id="game-content">
            <div className="cardTitle">Detalle</div>
            <div className="cardBody p0">
              {/* Este widget se “rellena” vía targeting cuando pinchas un partido */}
              <div className="card-body"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}