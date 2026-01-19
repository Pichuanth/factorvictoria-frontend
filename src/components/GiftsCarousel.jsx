import React from "react";

export default function GiftsCarousel({
  items = [],
  title = "Regalos por membresía",
  subtitle = "Desliza para ver los beneficios físicos incluidos en algunos planes.",
  showHeader = true,
}) {
  return (
    <section className="mt-10">
      {showHeader && (title || subtitle) ? (
        <div className="px-1 mb-4">
          {title ? (
            <div className="text-slate-100 font-bold text-lg">{title}</div>
          ) : null}
          {subtitle ? (
            <div className="text-slate-300/80 text-sm mt-1">{subtitle}</div>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
        {items.map((it) => (
          <div
            key={it.id}
            className="min-w-[85%] sm:min-w-[55%] md:min-w-[40%] snap-start"
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <img
                src={it.src}
                alt={it.alt || it.title}
                className="w-full h-56 sm:h-64 object-cover"
                loading="lazy"
              />
              <div className="p-4">
                <div className="text-slate-100 font-semibold">{it.title}</div>
                {it.note ? (
                  <div className="text-slate-300/80 text-sm mt-1">{it.note}</div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-400 mt-2 px-1">
        Tip: desliza horizontalmente para ver los 3 productos.
      </div>
    </section>
  );
}
