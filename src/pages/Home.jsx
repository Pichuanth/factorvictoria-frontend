// src/pages/Home.jsx
import { brand, plans, simulator, footer } from "../copy";

const fmt = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function PlanCard({ p }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6 text-white">
      {p.badge && (
        <div className="inline-block mb-3 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 text-xs font-bold">
          {p.badge}
        </div>
      )}
      <h3 className="text-xl font-semibold mb-1">{p.name}</h3>
      <div className="text-4xl font-black tracking-tight mb-4">{p.priceText}</div>
      <ul className="space-y-2 mb-5">
        {p.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-white/90">{b}</span>
          </li>
        ))}
      </ul>
      <button className="w-full rounded-xl py-3 font-semibold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900">
        Quiero este
      </button>
    </div>
  );
}

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 text-white">
      {/* Héroe */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-10 mb-8">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
          {brand.hero.titleH1}
        </h1>
        <p className="text-white/80 text-lg md:text-xl mb-6">{brand.hero.subtitle}</p>
        <a
          href="#planes"
          className="inline-block rounded-xl px-6 py-3 font-semibold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900"
        >
          {brand.hero.cta}
        </a>
      </section>

      {/* Planes */}
      <section id="planes" className="mb-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((p) => <PlanCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* Simulador */}
      <Simulator />

      {/* Imagen de cierre */}
      <section className="mt-10 rounded-3xl overflow-hidden border border-white/10">
        <img src={footer.heroImage} alt="escena futbol" className="w-full h-auto" />
      </section>
    </div>
  );
}

function Simulator() {
  const [amount, setAmount] = React.useState(10000);

  const onChange = (e) => {
    const v = Number(String(e.target.value).replace(/[^\d]/g, "")) || 0;
    setAmount(v);
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 mb-8">
      <h2 className="text-2xl md:text-3xl font-black mb-4">{simulator.title}</h2>
      <p className="text-white/80 mb-4">
        Ingresa un monto a apostar y descubre cuánto podrías ganar.
      </p>

      <input
        inputMode="numeric"
        value={amount}
        onChange={onChange}
        className="w-full max-w-md rounded-2xl bg-white text-slate-900 px-4 py-3 mb-6"
      />

      <div className="grid md:grid-cols-3 gap-4">
        {simulator.cards.map((c, i) => (
          <div key={i} className="rounded-3xl p-5 bg-white/5 border border-white/10">
            <div className="text-xl font-bold mb-1">{c.label}</div>
            <div className="text-white/70 mb-3">{c.caption}</div>
            <div className="text-3xl font-black">
              Ganancia: {fmt.format(amount * c.x)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3">
        {simulator.notes.map((n, i) => (
          <div key={i} className="rounded-xl px-4 py-3 bg-gradient-to-r from-amber-400/90 to-amber-500/90 text-slate-900 text-sm font-semibold">
            {n}
          </div>
        ))}
      </div>
    </section>
  );
}
