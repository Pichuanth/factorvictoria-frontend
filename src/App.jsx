export default function App() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header simple */}
      <header className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <img src="/logo-fv.png" alt="Factor Victoria" className="h-9 w-auto" />
          <span className="font-bold text-lg tracking-tight">Factor Victoria</span>
        </a>

        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <a href="/" className="hover:opacity-80">Inicio</a>
          <a href="/planes" className="hover:opacity-80">Planes</a>
          <a href="/contacto" className="hover:opacity-80">Contacto</a>
        </nav>
      </header>

      {/* Hero mínimo visible */}
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

      <footer className="text-center text-xs text-neutral-500 pb-10">
        © {new Date().getFullYear()} Factor Victoria
      </footer>
    </div>
  );
}
