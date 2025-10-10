// src/App.jsx
export default function App() {
  return (
    <div className="bg-white min-h-screen text-[#0b1730]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo-fv.png" alt="Factor Victoria" className="h-7 w-auto" />
            <span className="font-semibold tracking-tight">Factor Victoria</span>
          </a>

          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#beneficios" className="hover:opacity-80">Beneficios</a>
            <a href="#planes" className="hover:opacity-80">Planes</a>
            <a href="#faq" className="hover:opacity-80">FAQs</a>
            <a href="#contacto" className="hover:opacity-80">Contacto</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="max-w-6xl mx-auto px-5">
          <div className="rounded-[24px] border border-slate-200 p-8 sm:p-12 mt-6">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-center leading-tight">
              Factor Victoria
            </h1>
            <p className="text-center mt-3 text-slate-600">
              Render mínimo OK. Luego volvemos a la app completa.
            </p>

            <div className="mt-8 sm:mt-10">
              <img
                src="/hero-players.png"
                alt="Jugadores de fútbol"
                className="w-full rounded-2xl"
              />
            </div>

            <div className="mt-8 sm:mt-10 flex justify-center gap-3">
              <a
                href="#planes"
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold bg-[#0b1730] text-white hover:opacity-90"
              >
                Ver planes
              </a>
              <a
                href="#contacto"
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold border border-slate-300 hover:bg-slate-50"
              >
                Hablar con nosotros
              </a>
            </div>
          </div>
        </section>

        {/* Beneficios */}
        <section id="beneficios" className="max-w-6xl mx-auto px-5 mt-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">¿Por qué Factor Victoria?</h2>
          <p className="text-center text-slate-600 mt-2">
            Lo esencial para arrancar rápido y con foco en resultados.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: "Setup veloz",
                desc: "Arrancamos con un MVP que valida sin esperar meses.",
              },
              {
                title: "Diseño claro",
                desc: "Interfaz limpia y enfocada en conversión.",
              },
              {
                title: "Evolución ágil",
                desc: "Iteramos por etapas: menos riesgo, más control.",
              },
              {
                title: "SEO y performance",
                desc: "Buenas prácticas desde el día uno.",
              },
              {
                title: "Soporte cercano",
                desc: "Acompañamiento real, sin bots ni laberintos.",
              },
              {
                title: "Escalable",
                desc: "Base técnica lista para crecer cuando lo necesites.",
              },
            ].map((b, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-6">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                  <span className="text-xs font-bold text-slate-500">{i + 1}</span>
                </div>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Planes */}
        <section id="planes" className="max-w-6xl mx-auto px-5 mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">Planes</h2>
          <p className="text-center text-slate-600 mt-2">
            Elige el que calza con tu momento. Puedes crecer después.
          </p>

          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {/* Básico */}
            <div className="rounded-2xl border border-slate-200 p-6 flex flex-col">
              <h3 className="font-semibold text-lg">Básico</h3>
              <p className="text-sm text-slate-600 mt-1">Landing + secciones.</p>
              <div className="mt-4">
                <span className="text-3xl font-extrabold">$</span>
                <span className="text-3xl font-extrabold">99</span>
                <span className="text-slate-500">/único</span>
              </div>
              <ul className="mt-4 text-sm text-slate-700 space-y-2">
                <li>✓ Héroe, beneficios, planes, contacto</li>
                <li>✓ Ajustes de marca básicos</li>
                <li>— Integraciones a medida</li>
              </ul>
              <a
                href="#contacto"
                className="mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-slate-300 hover:bg-slate-50"
              >
                Empezar
              </a>
            </div>

            {/* Recomendado */}
            <div className="rounded-2xl border-2 border-[#0b1730] p-6 shadow-sm flex flex-col">
              <div className="self-start rounded-full px-3 py-1 text-xs bg-black text-white">Recomendado</div>
              <h3 className="font-semibold text-lg mt-3">Crecimiento</h3>
              <p className="text-sm text-slate-600 mt-1">Landing + blog/FAQ + métricas.</p>
              <div className="mt-4">
                <span className="text-3xl font-extrabold">$</span>
                <span className="text-3xl font-extrabold">199</span>
                <span className="text-slate-500">/único</span>
              </div>
              <ul className="mt-4 text-sm text-slate-700 space-y-2">
                <li>✓ Todo del Básico</li>
                <li>✓ Secciones extra (FAQ/Blog corto)</li>
                <li>✓ Métricas iniciales</li>
              </ul>
              <a
                href="#contacto"
                className="mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-[#0b1730] text-white hover:opacity-90"
              >
                Quiero este
              </a>
            </div>

            {/* A medida */}
            <div className="rounded-2xl border border-slate-200 p-6 flex flex-col">
              <h3 className="font-semibold text-lg">A medida</h3>
              <p className="text-sm text-slate-600 mt-1">Funcionalidades personalizadas.</p>
              <div className="mt-4">
                <span className="text-3xl font-extrabold">A conversar</span>
              </div>
              <ul className="mt-4 text-sm text-slate-700 space-y-2">
                <li>✓ Integraciones y flujos especiales</li>
                <li>✓ Roadmap y fases</li>
                <li>✓ Soporte extendido</li>
              </ul>
              <a
                href="#contacto"
                className="mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-slate-300 hover:bg-slate-50"
              >
                Agendar llamada
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-6xl mx-auto px-5 mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">Preguntas frecuentes</h2>
          <div className="mt-8 grid md:grid-cols-2 gap-5">
            {[
              {
                q: "¿Puedo partir con algo pequeño y crecer después?",
                a: "Sí. La idea es validar primero y evolucionar por etapas.",
              },
              {
                q: "¿Incluye hosting y dominio?",
                a: "Podemos usar tu Vercel y tu dominio. Te guiamos en la conexión.",
              },
              {
                q: "¿Puedo pedir cambios de estilo?",
                a: "Sí, en cada fase consideramos ajustes razonables de UI.",
              },
              {
                q: "¿Cuánto demora el entregable inicial?",
                a: "Días, no meses. El MVP visual se entrega muy rápido.",
              },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-6">
                <h3 className="font-semibold">{f.q}</h3>
                <p className="text-sm text-slate-600 mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contacto */}
        <section id="contacto" className="max-w-6xl mx-auto px-5 mt-16 mb-16">
          <div className="rounded-2xl border border-slate-200 p-8 sm:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold">¿Listo para empezar?</h2>
            <p className="text-slate-600 mt-2">
              Conversemos 10 minutos y te digo el camino más corto a tu primera versión.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://wa.me/XXXXXXXXXXX"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold bg-[#0b1730] text-white hover:opacity-90"
              >
                Escribir por WhatsApp
              </a>
              <a
                href="mailto:hola@factorvictoria.com?subject=Quiero%20conversar"
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold border border-slate-300 hover:bg-slate-50"
              >
                Enviar correo
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-neutral-500 py-10">
        © {new Date().getFullYear()} Factor Victoria
      </footer>
    </div>
  );
}
