// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Comparator from "./pages/Comparator.jsx";   // tu comparador
import Fixtures from "./pages/Fixtures.jsx";       // tus partidos

export default function App() {
  return (
    <Routes>
      {/* Home = Landing */}
      <Route path="/" element={<LandingPage />} />
      {/* Rutas existentes */}
      <Route path="/app" element={<Comparator />} />
      <Route path="/fixtures" element={<Fixtures />} />
      {/* Cualquier otra ruta -> Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
