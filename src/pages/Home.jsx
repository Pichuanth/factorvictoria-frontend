// src/pages/Home.jsx
import { Link } from "react-router-dom";
import copy from "../copy";
import Simulator from "../components/Simulator";
import { useAuth, PLAN_RANK } from "../lib/auth"; // <- sin .js

const GOLD = "#E6C464";

export default function Home() {
  const { isLoggedIn, user } = useAuth();

  // rank actual desde auth (coincide con lo que ve Comparador)
  const currentPlanId = user?.planId || null;
  const currentRank = currentPlanId != null ? (PLAN_RANK[currentPlanId] ?? null) : null;

  return (
    <div className="bg-slate-900">
      {/* Héroe */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-14">
        {/* Logo y nombre */}
        <div className="flex items-center gap-3">
          <img
            src="/logo-fv.png"
            alt="Factor Victoria"
            className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 object-contain"
          />
          <span className="text-white text-3xl md:text-4xl font-bold">Factor Victoria</span>
        </div>

        <div className="mt-4 inline-flex">
          <span className="px-4 py-1 rounded-full bg-slate-800 text-white/80 text-sm">
            Paga con Flow o Mercado Pago · hasta 6 cuotas*
          </span>
        </div>

        <h1 className="mt-6 text-white text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl">
          Convierte información <br /> en ventaja
        </h1>
        <p className="mt-4 text-white/80 text-lg max-w-3xl">{copy.marca.subclaim}</p>

        <Link
          to="#planes"
          className="inline-flex mt-6 px-6 py-3 rounded-2xl font-semibold shadow hover:opacity-90"
          style={{ backgroundColor: GOLD, color: "#0f172a" }}
        >
          {copy.ctas.verPlanes}
        </Link>
      </section>

      {/* Planes */}
      <section id="planes" className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid gap-6 md:grid-cols-2">
          {copy.planes.map((p) => {
            // rank objetivo del card (usa las mismas claves que auth)
            const targetRank = PLAN_RANK[p.id] ?? 0;

            // CTA por defecto
            let ctaLabel = "Comprar";
            let ctaStyle = { backgroundColor: GOLD, color: "#0f172a" };
            let ctaDisabled = false;

            if (isLoggedIn && currentRank != null) {
              if (targetRank === currentRank) {
                ctaLabel = "Plan actual";
                ctaStyle = {
                  backgroundColor: "rgba(34,197,94,0.18)", // verde suave
                  color: "#22c55e",
                };
                ctaDisabled = true;
              } else if (targetRank > currentRank) {
                ctaLabel = "Mejorar";
                ctaStyle = { backgroundColor: GOLD, color: "#0f172a" };
              } else {
                // solo los inferiores muestran "Bajar plan"
                ctaLabel = "Bajar plan";
                ctaStyle = {
                  backgroundColor: "transparent",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.15)",
                };
              }
            }

            return (
              <div
                key={p.id}
                id={`plan-${p.id}`}
                className={
                  "rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 relative " +
                  (p.badge ? "ring-2" : "")
                }
                style={p.badge ? { boxShadow: `0 0 0 4px ${GOLD} inset` } : undefined}
              >
                {p.badge && (
                  <span
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold rounded-full shadow"
                    style={{ backgroundColor: GOLD, color: "#0f172a" }}
                  >
                    {p.badge}
                  </span>
                )}

                <h3 className="text-white text-2xl font-bold">{p.title}</h3>

                <div className="mt-2 text-3xl md:text-4xl font-extrabold text-white flex items-baseline gap-2">
                  <span>{p.priceCLP}</span>
                  {p.freq && (
                    <span className="text-white/60 text-base font-medium">{p.freq}</span>
                  )}
                  {p.note && (
                    <span className="text-white/80 text-sm font-medium">{p.note}</span>
                  )}
                </div>

                <ul className="mt-5 space-y-2 text-white/90">
                  {p.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span
                        className="mt-2 h-2 w-2 rounded-full"
                        style={{ backgroundColor: GOLD }}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <a
                    href={ctaDisabled ? undefined : `/checkout?plan=${p.id}`}
                    onClick={(e) => {
                      if (ctaDisabled) e.preventDefault();
                    }}
                    className="inline-flex px-6 py-3 rounded-2xl font-semibold hover:opacity-90"
                    style={ctaStyle}
                    aria-disabled={ctaDisabled}
                  >
                    {ctaLabel}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Simulador */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <Simulator />
      </section>

      {/* Imagen de cierre */}
      <section className="max-w-6xl mx-auto px-0 pb-4">
        <img
          src="/hero-players.png"
          className="w-full object-cover"
          alt={copy.home?.imagenCierreAlt || "Jugadores"}
        />
      </section>

      {/* Footer */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-white text-3xl font-bold mb-3">
          {copy.home?.acercaTitulo || "Convierte información en ventaja"}
        </h2>
        <p className="text-white/80 whitespace-pre-line">
          {copy.home?.acercaTexto ||
            "Nuestra IA analiza estadísticas, tendencias y señales del mercado para detectar cuotas con valor."}
        </p>
        <div className="mt-6 text-white/50 text-sm text-center">© 2025 Factor Victoria</div>
      </section>
    </div>
  );
}
