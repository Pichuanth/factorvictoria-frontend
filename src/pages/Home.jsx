// src/pages/Home.jsx
import { Link } from "react-router-dom";
import copy from "../copy";
import Simulator from "../components/Simulator";
import { useAuth, PLAN_RANK } from "../lib/auth";

const PLAN_ID_TO_RANK = {
  basic: PLAN_RANK.basic,
  trimestral: PLAN_RANK.trimestral,
  anual: PLAN_RANK.anual,
  vitalicio: PLAN_RANK.vitalicio,
};

const RANK_TO_LABEL = {
  [PLAN_RANK.basic]: "BÁSICO",
  [PLAN_RANK.trimestral]: "TRIMESTRAL",
  [PLAN_RANK.anual]: "ANUAL",
  [PLAN_RANK.vitalicio]: "VITALICIO",
};

// Derivar rank del usuario (mismo criterio que usamos en Comparator)
function deriveRank(user) {
  if (typeof user?.rank === "number") return user.rank;

  const mapStr = {
    basic: PLAN_RANK.basic,
    básico: PLAN_RANK.basic,
    basico: PLAN_RANK.basic,
    mensual: PLAN_RANK.basic,
    trimestral: PLAN_RANK.trimestral,
    anual: PLAN_RANK.anual,
    yearly: PLAN_RANK.anual,
    vitalicio: PLAN_RANK.vitalicio,
    lifetime: PLAN_RANK.vitalicio,
  };

  if (typeof user?.rank === "string") {
    const k = user.rank.trim().toLowerCase();
    if (k in mapStr) return mapStr[k];
  }
  const planName =
    user?.plan || user?.planName || user?.membership || user?.tier || "";
  if (typeof planName === "string") {
    const k = planName.trim().toLowerCase();
    if (k in mapStr) return mapStr[k];
  }

  const price =
    Number(String(user?.priceCLP || user?.planPrice || user?.price || "").replace(/\D/g, "")) ||
    null;
  const priceToRank = {
    19990: PLAN_RANK.basic,
    44990: PLAN_RANK.trimestral,
    99990: PLAN_RANK.anual,
    249990: PLAN_RANK.vitalicio,
  };
  if (price && priceToRank[price]) return priceToRank[price];

  return PLAN_RANK.basic;
}

export default function Home() {
  const { isLoggedIn, user } = useAuth();
  const userRank = isLoggedIn ? deriveRank(user) : null;

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
          <span className="text-white text-3xl md:text-4xl font-bold">
            Factor Victoria
          </span>
        </div>

        <div className="mt-4 inline-flex">
          <span className="px-4 py-1 rounded-full bg-slate-800 text-white/80 text-sm">
            Paga con Flow o Mercado Pago · hasta 6 cuotas*
          </span>
        </div>

        <h1 className="mt-6 text-white text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl">
          Convierte información <br /> en ventaja
        </h1>
        <p className="mt-4 text-white/80 text-lg max-w-3xl">
          {copy.marca.subclaim}
        </p>

        <Link
          to="#planes"
          className="inline-flex mt-6 px-6 py-3 rounded-2xl bg-[#E6C464] text-slate-900 font-semibold shadow hover:opacity-90"
        >
          {copy.ctas.verPlanes}
        </Link>
      </section>

      {/* Planes */}
      <section id="planes" className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid gap-6 md:grid-cols-2">
          {copy.planes.map((p) => {
            const targetRank = PLAN_ID_TO_RANK[p.id] ?? PLAN_RANK.basic;
            const isCurrent = isLoggedIn && userRank === targetRank;
            const canUpgrade = isLoggedIn && userRank < targetRank;

            return (
              <div
                key={p.id}
                id={`plan-${p.id}`}
                className={
                  "rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 relative " +
                  (p.badge ? "ring-2 ring-[#E6C464]" : "")
                }
              >
                {p.badge && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold rounded-full bg-[#E6C464] text-slate-900 shadow">
                    {p.badge}
                  </span>
                )}

                <h3 className="text-white text-2xl font-bold">{p.title}</h3>

                <div className="mt-2 text-3xl md:text-4xl font-extrabold text-white flex items-baseline gap-2">
                  <span>{p.priceCLP}</span>
                  {p.freq && (
                    <span className="text-white/60 text-base font-medium">
                      {p.freq}
                    </span>
                  )}
                  {p.note && (
                    <span className="text-white/80 text-sm font-medium">
                      {p.note}
                    </span>
                  )}
                </div>

                <ul className="mt-5 space-y-2 text-white/90">
                  {p.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-2 h-2 w-2 rounded-full bg-[#E6C464]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {!isLoggedIn && (
                    <a
                      href={`/checkout?plan=${p.id}`}
                      className="inline-flex px-6 py-3 rounded-2xl bg-[#E6C464] text-slate-900 font-semibold hover:opacity-90"
                    >
                      {copy.ctas.comprar}
                    </a>
                  )}

                  {isLoggedIn && isCurrent && (
                    <button
                      className="inline-flex px-6 py-3 rounded-2xl bg-white/10 text-white/60 font-semibold cursor-not-allowed"
                      title={`Tu plan actual: ${RANK_TO_LABEL[userRank]}`}
                      disabled
                    >
                      Plan actual
                    </button>
                  )}

                  {isLoggedIn && !isCurrent && (
                    <a
                      href={`/checkout?plan=${p.id}`}
                      className="inline-flex px-6 py-3 rounded-2xl bg-[#E6C464] text-slate-900 font-semibold hover:opacity-90"
                      title={canUpgrade ? "Mejorar plan" : "Cambiar plan"}
                    >
                      {canUpgrade ? "Mejorar" : "Cambiar"}
                    </a>
                  )}
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

      {/* Acerca de */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-white text-3xl font-bold mb-3">
          {copy.home?.acercaTitulo || "Convierte información en ventaja"}
        </h2>
        <p className="text-white/80 whitespace-pre-line">
          {copy.home?.acercaTexto ||
            "Nuestra IA analiza estadísticas, tendencias y señales del mercado para detectar cuotas con valor."}
        </p>
        <div className="mt-6 text-white/50 text-sm text-center">
          © 2025 Factor Victoria
        </div>
      </section>
    </div>
  );
}
