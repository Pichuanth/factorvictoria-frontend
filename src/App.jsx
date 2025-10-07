import { Routes, Route, NavLink } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Comparator  from "./pages/Comparator.jsx";
import Fixtures    from "./pages/Fixtures.jsx";
import Gracias     from "./pages/Gracias.jsx";

export default function App(){
  return (
    <>
      {/* Topbar con tabs */}
      <div className="topbar">
        <NavLink className={({isActive})=> isActive? "navlink active":"navlink"} to="/">Inicio</NavLink>
        <NavLink className={({isActive})=> isActive? "navlink active":"navlink"} to="/app">Comparador</NavLink>
        <NavLink className={({isActive})=> isActive? "navlink active":"navlink"} to="/fixtures">Partidos</NavLink>
      </div>

      <Routes>
        <Route path="/"         element={<LandingPage/>} />
        <Route path="/app"      element={<Comparator/>} />
        <Route path="/fixtures" element={<Fixtures/>} />
        <Route path="/gracias"  element={<Gracias/>} />
        <Route path="*"         element={<div style={{padding:24}}>404</div>} />
      </Routes>
    </>
  );
}
