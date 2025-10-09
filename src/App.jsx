import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Comparator from "./pages/Comparator.jsx";
import Fixtures from "./pages/Fixtures.jsx";
import Login from "./pages/Login.jsx";
import Forgot from "./pages/Forgot.jsx";

function Tab({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => "tab" + (isActive ? " active" : "")}
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <div className="nav-inner container">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/logo-fv.png" alt="Factor Victoria" className="hero-logo" />
            <b>Factor Victoria</b>
          </div>
          <div className="tabs">
            <Tab to="/">Inicio</Tab>
            <Tab to="/app">Comparador</Tab>
            <Tab to="/fixtures">Partidos</Tab>
            <Tab to="/login">Iniciar sesión</Tab>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<Comparator />} />
        <Route path="/fixtures" element={<Fixtures />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
