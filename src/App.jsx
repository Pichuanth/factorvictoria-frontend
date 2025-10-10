import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <img src="/logo-fv.png" alt="Factor Victoria" className="h-8 w-auto" />
          <span className="font-bold tracking-tight">Factor Victoria</span>
        </a>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/">Inicio</Link>
          <Link to="/planes">Planes</Link>
          <Link to="/contacto">Contacto</Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-16">{children}</main>

      <footer className="text-center text-xs text-neutral-500 pb-10">
        © {new Date().getFullYear()} Factor Victoria
      </footer>
    </div>
  );
}

function Home() {
  return (
    <section className="rounded-3xl border border-[#e5e7eb] p-8 sm:p-10 mt-4">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center">Factor Victoria</h1>
      <p className="text-center mt-3 text-[#0b1730]/80">
        Render mínimo OK. Luego volvemos a la app completa.
      </p>
      <div className="mt-8">
        <img src="/hero-players.png" alt="Jugadores" className="w-full rounded-xl" />
      </div>
    </section>
  );
}
function Planes() { return <div className="p-6">Planes</div>; }
function Contacto() { return <div className="p-6">Contacto</div>; }

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/planes" element={<Planes />} />
          <Route path="/contacto" element={<Contacto />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
