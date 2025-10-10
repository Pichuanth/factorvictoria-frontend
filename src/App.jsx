// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Si tienes un Header, descomenta e importa:
// import Header from "./components/Header.jsx";

import Home from "./pages/Home.jsx";
import Comparador from "./pages/Comparador.jsx"; // o la ruta que uses para /app
import Fixtures from "./pages/Fixtures.jsx";      // o Fixtures.jsx/tsx según tu archivo
import Login from "./pages/Login.jsx";

export default function App() {
  return (
    <BrowserRouter>
      {/* <Header /> */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<Comparador />} />
        <Route path="/fixture" element={<Fixtures />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
