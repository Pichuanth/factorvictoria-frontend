import { Routes, Route, NavLink, Link, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Comparator  from "./pages/Comparator.jsx";
import Fixtures    from "./pages/Fixtures.jsx";
import Gracias     from "./pages/Gracias.jsx";
import Login       from "./pages/Login.jsx";

function NotFound({ loc }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>404</h2>
      <p>Ruta no encontrada: <code>{loc.pathname}</code></p>
      <p><Link to="/app">Ir al comparador</Link></p>
    </div>
  );
}

export default function App(){
  const loc = useLocation();
  return (
    <>
      {/* Navbar */}
      <header className="navbar">
        <div className="navbar-inner">
          <nav className="navlinks">
            <NavLink className={({isActive})=>`navlink ${isActive?"active":""}`} to="/">Inicio</NavLink>
            <NavLink className={({isActive})=>`navlink ${isActive?"active":""}`} to="/app">Comparador</NavLink>
            <NavLink className={({isActive})=>`navlink ${isActive?"active":""}`} to="/fixtures">Partidos</NavLink>
          </nav>
          <Link className="navlink" to="/login">Iniciar sesión</Link>
        </div>
      </header>

      {/* Rutas */}
      <Routes>
        <Route path="/"         element={<LandingPage />} />
        <Route path="/app"      element={<Comparator />} />
        <Route path="/fixtures" element={<Fixtures />} />
        <Route path="/gracias"  element={<Gracias />} />
        <Route path="/login"    element={<Login />} />
        <Route path="*"         element={<NotFound loc={loc} />} />
      </Routes>
    </>
  );
}
