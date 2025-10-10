// src/App.jsx
import React from "react";
import copy from "./copy"; // 👈 DEFAULT export

function Section({ children }) {
  return <section className="max-w-6xl mx-auto px-4 py-8">{children}</section>;
}

export default function App() {
  // guardas suaves por si algo viniera undefined
  const hero = copy?.hero ?? {
    badge: "",
    title: "Factor Victoria",
    subtitle: "",
    cta: "Ver planes",
  };
  const plans = Array.isArray(copy?.plans) ? copy.plans : [];

  return (
    <div className="bg-[#0E1826] min-h-screen text-white">
      {/* Navbar mínima */}
      <header className="sticky top-0 z-30 bg-[#0E1826]/90 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="font-semibold">Factor Victoria</a>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="px-3 py-1 rounded-full bg-amber-400/80 text-slate-900 font-medium">Inicio</a>
            <a href="/app" className="px-3 py-1 rounded-full bg-white/10">Comparador</a>
            <a href="/fixture" className="px-3 py-1 rounded-full bg-white/10">Partidos</a>
            <a href="/login" className="px-3 py-1 rounded-full bg-white/10">Iniciar sesión</a>
          </nav>
        </div>
      </header>

      {/* Héroe */}
      <Section>
        {hero.badge && (
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-sm mb-4">
            {hero.badge}
          </div>
        )}
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
          {hero.title}
        </h1>
        <p className="text-white/80 mt-4 max-w-2xl">
          {hero.subtitle}
        </p>
        <a
          href="#planes"
          className="inline-block mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 font-semibold shadow"
        >
          {hero.cta || "Ver planes"}
        </a>
      </Section>

      {/* Planes */}
      <Section>
        <h2 id="planes" className="text-2xl md:text-3xl font-bold mb-6">Planes</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((p, i) => (
            <div
              key={i}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              {p.tag && (
                <div className="inline-block text-xs mb-3 px-2 py-1 rounded-full bg-amber-400 text-slate-900 font-semibold">
                  {p.tag}
                </div>
              )}
              <h3 className="text-xl font-bold mb-1">{p.name}</h3>
              <div className="text-4xl font-extrabold">
                {p.price} <span className="text-base font-medium">{p.per || ""}</span>
              </div>

              <ul className="mt-4 space-y-2 text-white/90">
                {(p.bullets || []).map((b, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <button className="mt-6 w-full rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 font-semibold py-3">
                {p.cta || "Elegir"}
              </button>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="text-white/70">Sin planes cargados.</div>
          )}
        </div>
      </Section>

      {/* Footer simple */}
      <footer className="border-t border-white/10 py-8 text-center text-white/60">
        {copy?.footer?.legal ?? "© Factor Victoria"}
      </footer>
    </div>
  );
}
