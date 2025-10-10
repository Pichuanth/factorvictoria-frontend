// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";

import Home from "./pages/Home.jsx";
import Fixtures from "./pages/Fixtures.jsx";
import Login from "./pages/Login.jsx";

// OJO: si tu comparador real está en otro archivo, cambia el import aquí:
import Comparador from "./pages/Comparador.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<Comparador />} />
        <Route path="/fixture" element={<Fixtures />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
