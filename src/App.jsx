import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";

// Páginas
import Home from "./pages/Home.jsx";
import Comparator from "./pages/App.jsx";     // tu comparador ya existente
import Fixtures from "./pages/Fixtures.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<Comparator />} />
        <Route path="/fixture" element={<Fixtures />} />
        <Route path="/login" element={<Login />} />
        {/* Fallback opcional */}
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
