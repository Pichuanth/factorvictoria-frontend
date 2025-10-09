import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-white min-h-screen">
        <Header />

        <main className="max-w-5xl mx-auto px-6 pb-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/planes" element={<Planes />} />
            <Route path="/contacto" element={<Contacto />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

function Header() {
  return (
    <header className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <img src="/logo-fv.png" alt="Factor Victoria" className="h-9 w-auto" />
        <span className="font-bold text-lg tracking-tight">Factor Victoria</span>
      </Link>

      <nav className="hidden sm:flex items-center gap-6 text-sm">
        <Link to="/" className="hover:opacity-80">Inicio</Link>
        <Link to="/planes" className="hover:opacity-80">Planes</Link>
        <Link to="/contacto" className="hover:opacity-80">Contacto</Link>
      </nav>
    </header>
  );
}

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
  return <div className="p-6">Planes</div>;
}

function Contacto() {
  return <div className="p-6">Contacto</div>;
}

function Footer() {
  return (
    <footer className="text-center text-xs text-neutral-500 pb-10">
      © {new Date().getFullYear()} Factor Victoria
    </footer>
  );
}
