// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import Home from "./pages/Home";
import Comparator from "./pages/Comparator";
import Fixtures from "./pages/Fixtures"; // el que ya corregimos
import Login from "./pages/Login";       // si ya existe déjalo; si no, abajo te dejo uno simple
import { brand } from "./copy";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: "#0d1624" }}>
        <Nav />

        {/* banner de pago (Flow/Mercado Pago) */}
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="rounded-2xl px-4 py-3 bg-white/5 text-white/90 inline-block">
            {brand.payBanner}
          </div>
        </div>

        <main className="pt-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/app" element={<Comparator />} />
            <Route path="/fixture" element={<Fixtures />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
