import { Link, Routes, Route } from "react-router-dom";

function Header() {
  return (
    <header className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <a href="/" className="flex items-center gap-3">
        <img src="/logo-fv.png" alt="Factor Victoria" className="h-8 w-auto" />
        <span className="font-bold text-lg tracking-tight">Factor Victoria</span>
      </a>

      <nav className="flex items-center gap-6 text-sm">
        <Link to="/" className="hover:opacity-80">Inicio</Link>
        <Link to="/planes" className="hover:opacity-80">Planes</Link>
        <Link to="/contacto" className="hover:opacity-80">Contacto</Link>
      </nav>
    </header>
  );
}

function Home() {
  return (
    <main className="max-w-6xl mx-auto px-6 pb-16">
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
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="text-2xl font-semibold">Planes</h2>
      <p className="mt-3 text-neutral-700">Pronto publicaremos los planes.</p>
    </main>
  );
}

function Contacto() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="text-2xl font-semibold">Contacto</h2>
      <p className="mt-3 text-neutral-700">Escríbenos y te respondemos.</p>
    </main>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/planes" element={<Planes />} />
        <Route path="/contacto" element={<Contacto />} />
      </Routes>

      <footer className="text-center text-xs text-neutral-500 pb-10">
        © {new Date().getFullYear()} Factor Victoria
      </footer>
    </div>
  );
}
