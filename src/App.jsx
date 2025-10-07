import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Comparator  from "./pages/Comparator.jsx";
import Fixtures    from "./components/Fixtures.jsx";
import Gracias     from "./pages/Gracias.jsx";

function NotFound({ loc }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>404</h2>
      <p>Ruta no encontrada: <code>{loc.pathname}</code></p>
      <p><NavLink to="/app" className="nav-link">Ir al comparador</NavLink></p>
    </div>
  );
}

export default function App(){
  const loc = useLocation();

  const linkClass = ({isActive}) =>
    `nav-link ${isActive ? "nav-link-active" : ""}`;

  return (
    <>
      {/* Barra superior simple */}
      <div className="w-full border-b border-gray-100 bg-white/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
          <img src="/logo-fv.png" alt="Factor Victoria" className="h-10 w-10 md:h-12 md:w-12 rounded-md" />
          <div className="font-extrabold tracking-tight text-xl md:text-2xl text-slate-900">
            Factor <span className="fv-gold">Victoria</span>
          </div>

          <nav className="ml-auto flex items-center gap-2">
            <NavLink to="/"        className={linkClass} end>Inicio</NavLink>
            <NavLink to="/app"     className={linkClass}>Comparador</NavLink>
            <NavLink to="/fixtures"className={linkClass}>Partidos</NavLink>
          </nav>
        </div>
      </div>

      <Routes>
        <Route path="/"         element={<LandingPage />} />
        <Route path="/app"      element={<Comparator />} />
        <Route path="/fixtures" element={<Fixtures />} />
        <Route path="/gracias"  element={<Gracias />} />
        <Route path="*"         element={<NotFound loc={loc} />} />
      </Routes>
    </>
  );
}
