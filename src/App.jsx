// src/App.jsx
import { Routes, Route, NavLink } from "react-router-dom";

export default function App() {
  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <img src="/logo-fv.png" alt="Factor Victoria" className="h-8 w-auto" />
          <span className="font-semibold tracking-tight">Factor Victoria</span>
        </a>

        <nav className="flex items-center gap-6 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "font-medium" : "hover:opacity-80"
            }
          >
            Inicio
          </NavLink>
          <NavLink
            to="/planes"
            className={({ isActive }) =>
              isActive ? "font-medium" : "hover:opacity-80"
            }
          >
            Planes
          </NavLink>
          <NavLink
            to="/contacto"
            className={({ isActive }) =>
              isActive ? "font-medium" : "hover:opacity-80"
            }
          >
            Contacto
          </NavLink>
        </nav>
      </header>

      {/* Contenido según la ruta */}
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/planes" element={<Planes />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="text-center text-xs text-neutral-500 pb-10">
        © {new Date().getFullYear()} Factor Victoria
      </footer>
    </div>
  );
}

/* ====== Páginas ====== */

function Home() {
  return (
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
  );
}

function Planes() {
  return (
    <section className="p-6">
      <h2 className="text-2xl font-semibold mb-2">Planes</h2>
      <p className="text-[#0b1730]/80">Contenido de planes (placeholder).</p>
    </section>
  );
}

function Contacto() {
  return (
    <section className="p-6">
      <h2 className="text-2xl font-semibold mb-2">Contacto</h2>
      <p className="text-[#0b1730]/80">Contenido de contacto (placeholder).</p>
    </section>
  );
}

function NotFound() {
  return (
    <section className="p-6">
      <h2 className="text-2xl font-semibold mb-2">Página no encontrada</h2>
      <p className="text-[#0b1730]/80">
        La ruta que abriste no existe. Vuelve al Inicio.
      </p>
    </section>
  );
}
