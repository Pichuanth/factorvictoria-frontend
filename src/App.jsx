// src/App.jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'

function Header() {
  return (
    <header className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <img src="/logo-fv.png" alt="Factor Victoria" className="h-9 w-auto" />
        <span className="font-bold text-lg tracking-tight">Factor Victoria</span>
      </Link>

      <nav className="hidden sm:flex items-center gap-6 text-sm">
        <Link to="/app" className="hover:opacity-80">Iniciar</Link>
        <Link to="/planes" className="hover:opacity-80">Planes</Link>
        <Link to="/contacto" className="hover:opacity-80">Contacto</Link>
      </nav>
    </header>
  )
}

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
  )
}

function Planes() {
  return (
    <main className="max-w-5xl mx-auto px-6 pb-16">
      <section id="planes" className="rounded-2xl border border-[#e5e7eb] p-6 sm:p-8 mt-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Planes</h2>
        <p className="mt-2 text-[#0b1730]/80">
          Aquí puedes describir tus planes (Básico, Pro, Empresa) y precios.
        </p>

        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <div className="rounded-xl border p-4">
            <h3 className="font-semibold">Básico</h3>
            <p className="text-sm text-neutral-600 mt-1">Ideal para empezar.</p>
            <p className="text-xl font-bold mt-3">$9.99</p>
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="font-semibold">Pro</h3>
            <p className="text-sm text-neutral-600 mt-1">Para equipos.</p>
            <p className="text-xl font-bold mt-3">$19.99</p>
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="font-semibold">Empresa</h3>
            <p className="text-sm text-neutral-600 mt-1">Escala y soporte.</p>
            <p className="text-xl font-bold mt-3">A consultar</p>
          </div>
        </div>
      </section>
    </main>
  )
}

function Contacto() {
  return (
    <main className="max-w-5xl mx-auto px-6 pb-16">
      <section id="contacto" className="rounded-2xl border border-[#e5e7eb] p-6 sm:p-8 mt-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Contacto</h2>
        <p className="mt-2 text-[#0b1730]/80">
          Escribe tu correo y nos pondremos en contacto.
        </p>

        <form className="mt-6 grid sm:grid-cols-[1fr_auto] gap-3 max-w-xl">
          <input
            type="email"
            placeholder="tu@email.com"
            className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0b1730]/20"
            required
          />
          <button
            type="submit"
            className="rounded-lg px-4 py-2 font-medium border bg-black text-white hover:opacity-90"
          >
            Enviar
          </button>
        </form>
      </section>
    </main>
  )
}

function NotFound() {
  return (
    <main className="max-w-5xl mx-auto px-6 pb-16">
      <section className="rounded-2xl border border-[#e5e7eb] p-6 sm:p-8 mt-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">Página no encontrada</h2>
        <p className="mt-2 text-[#0b1730]/80">Vuelve al inicio.</p>
        <div className="mt-4">
          <Link to="/" className="text-blue-600 underline">Ir al inicio</Link>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  return (
    <div className="bg-white min-h-screen">
      <BrowserRouter>
        <Header />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/planes" element={<Planes />} />
          <Route path="/contacto" element={<Contacto />} />
          {/* si algún path no existe */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        <footer className="text-center text-xs text-neutral-500 pb-10">
          © {new Date().getFullYear()} Factor Victoria
        </footer>
      </BrowserRouter>
    </div>
  )
}
