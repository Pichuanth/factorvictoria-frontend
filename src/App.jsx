import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import Comparador from "./pages/Comparador.jsx";
import Fixtures from "./pages/Fixtures.jsx";   // si no lo tienes, crea un placeholder
import Login from "./pages/Login.jsx";         // si no lo tienes, crea un placeholder

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
