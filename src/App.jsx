import { Routes, Route, Link, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Comparator  from "./pages/Comparator.jsx";
import Fixtures    from "./components/Fixtures.jsx";
import Gracias     from "./pages/Gracias.jsx";

function NotFound({ loc }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>404</h2>
      <p>Ruta no encontrada: <code>{loc.pathname}</code></p>
      <p><Link to="/app">Ir al comparador</Link></p>
    </div>
  );
}

export default function App() {
  const loc = useLocation();
  return (
    <>
      <div style={{ padding: 12, borderBottom: "1px solid #eee" }}>
        <Link to="/" style={{ marginRight: 12 }}>Inicio</Link>
        <Link to="/app" style={{ marginRight: 12 }}>Comparador</Link>
        <Link to="/fixtures" style={{ marginRight: 12 }}>Partidos</Link>
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
