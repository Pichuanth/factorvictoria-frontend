// src/App.jsx
import { Link, Routes, Route } from "react-router-dom";

export default function App() {
  return (
    <div className="bg-white min-h-screen text-[#0b1730]">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <img src="/logo-fv.png" alt="Factor Victoria" className="h-8 w-auto" />
          <span className="font-bold tracking-tight">Factor Victoria</span>
        </a>

        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <Link className="hover:opacity-80" to="/">Inicio</Link>
          <Link className="hover:opacity-80" to="/planes">Planes</Link>
          <Link className="hover:opacity-80" to="/contacto">Contacto</Link>
        </nav>
      </header>

      {/* Rutas */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/planes" element={<Planes />} />
        <Route path="/contacto" element={<Contacto />} />
      </Routes>

      {/* Footer */}
      <footer className="text-center text-xs text-neutral-500 py-10">
        © {new Date().getFullYear()} Factor Victoria
      </footer>
    </div>
  );
}

/* ---------- Páginas ---------- */

function Home() {
  return (
    <main className="max-w-5xl mx-auto px-6 pb-16">
      <section className="rounded-3xl border border-[#e5e7eb] p-8 sm:p-10 mt-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center">
          Factor Victoria
        </h1>
        <p className="text-center mt-3 text-[#0b1730]/80">
          Render mínimo OK. Luego volvemos a la app completa.
        </p>

        <div className="mt-8">
          <img
            src="/hero-players.png"
            alt="Jugadores de fútbol"
            className="w-full rounded-xl"
          />
        </div>
      </section>
    </main>
  );
}

function Planes() {
  return (
    <main className="max-w-5xl mx-auto px-6 pb-16">
      <section className="rounded-3xl border border-[#e5e7eb] p-8 sm:p-10 mt-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Planes</h2>
        <p className="mt-3 text-[#0b1730]/80">Aquí van los planes y precios.</p>
      </section>
    </main>
  );
}

function Contacto() {
  return (
    <main className="max-w-5xl mx-auto px-6 pb-16">
      <section className="rounded-3xl border border-[#e5e7eb] p-8 sm:p-10 mt-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Contacto</h2>
        <p className="mt-3 text-[#0b1730]/80">Tu sección de contacto.</p>
      </section>
    </main>
  );
}
