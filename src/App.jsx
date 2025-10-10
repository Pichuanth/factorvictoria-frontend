import { BrowserRouter, Routes, Route } from "react-router-dom";

// Páginas
import Home from "./pages/Home.jsx";
import Fixtures from "./pages/Fixtures.jsx";
import Login from "./pages/Login.jsx";
// Si tu comparador está en otro archivo, ajusta este import:
import Comparador from "./pages/Comparador.jsx";

// Layout
import Header from "./components/Header.jsx";

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
