// src/pages/Comparator.jsx
import { comparator, simulator } from "../copy";

export default function Comparator() {
  return (
    <div className="max-w-6xl mx-auto px-4 text-white">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">{comparator.title}</h1>

      {/* Buscador */}
      <input
        className="w-full rounded-2xl bg-white text-slate-900 px-4 py-3 mb-6"
        placeholder={comparator.searchPlaceholder}
      />

      {/* Tiers */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {comparator.tiers.map((t, i) => (
          <div key={i} className="rounded-3xl p-6 bg-white/5 border border-white/10 relative overflow-hidden">
            <div className="text-2xl font-black mb-1">{t.name}</div>
            <div className="text-white/80 mb-4">{t.priceText}</div>

            <button
              className={
                "w-full rounded-xl py-3 font-semibold " +
                (t.unlocked
                  ? "bg-slate-900 text-white border border-amber-400"
                  : "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900")
              }
            >
              {t.cta}
            </button>

            {!t.unlocked && (
              <div className="absolute right-4 top-4 h-6 w-6 rounded bg-white/10 grid place-items-center">
                🔒
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Generar (bloques dorados) */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
        <button className="mb-6 rounded-xl px-6 py-3 font-semibold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900">
          Generar
        </button>

        {/* Tres tablas “placeholder” (fecha/local/visita/bookmaker/mercado) */}
        {[10, 20, 50].map((x, idx) => (
          <div key={idx} className="mb-6">
            <TableBlock title={`VALOR x${x} ${x === 10 ? "y/o aproximado" : x === 20 ? "promedio (cuota 1.5 a 3 máximo)" : "cuota desfase del mercado"}`} />
          </div>
        ))}

        {/* Resumen/Notas como en Home */}
        <h3 className="text-xl font-bold mt-6 mb-3">Cuotas generadas y porcentaje de acierto</h3>
        <div className="grid gap-3">
          {simulator.notes.map((n, i) => (
            <div key={i} className="rounded-xl px-4 py-3 bg-gradient-to-r from-amber-400/90 to-amber-500/90 text-slate-900 text-sm font-semibold">
              {n}
            </div>
          ))}
        </div>

        {/* Upsell */}
        <h3 className="text-xl font-bold mt-8 mb-3">{comparator.upsell.title}</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {comparator.upsell.buttons.map((b, i) => (
            <button
              key={i}
              className="rounded-xl px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-semibold"
            >
              {b} <span className="ml-2">🔒</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function TableBlock({ title }) {
  const Row = ({ label }) => (
    <div className="grid grid-cols-5 gap-2">
      {["(DATO)", "(DATO)", "(DATO)", "(DATO)", "(DATO)"].map((c, i) => (
        <div key={i} className="rounded-lg px-3 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-bold text-sm">
          {c}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-5 gap-2 mb-2">
        {["FECHA", "LOCAL", "VISITA", "BOOKMAKER", "MERCADO"].map((h, i) => (
          <div key={i} className="rounded-lg px-3 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-extrabold">
            {h}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Row />
        <Row />
        <Row />
      </div>
      <div className="mt-3 text-right text-xs text-white/70">{title}</div>
    </div>
  );
}
