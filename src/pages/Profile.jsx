// src/pages/Profile.jsx
import React from "react";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

function formatDate(d) {
  if (!d) return "—";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("es-CL", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function Profile() {
  const { user } = useAuth();

  // Datos básicos del usuario (con fallback)
  const name =
    user?.name || user?.fullName || user?.email?.split("@")[0] || "Usuario";
  const email = user?.email || "sin-correo@ejemplo.com";

  // Plan / membresía
  const rawPlan =
    user?.planId || user?.plan?.id || user?.plan || user?.membership || "";
  const planLabel = String(rawPlan || "MENSUAL").toUpperCase();

  let readablePlan = "Plan mensual";
  if (planLabel.includes("VITA")) readablePlan = "Plan vitalicio";
  else if (planLabel.includes("ANU")) readablePlan = "Plan anual";
  else if (planLabel.includes("TRI") || planLabel.includes("3"))
    readablePlan = "Plan trimestral";

  // Fechas (simples por ahora; cuando tengamos backend real se llenan bien)
  const createdAt = user?.createdAt || user?.created_at || null;
  const expiresAt =
    user?.expiresAt || user?.expires_at || null; // si no hay, mostramos “—”

  // Beneficios según plan (solo texto descriptivo por ahora)
  const benefits = [
    "Acceso al comparador profesional de parlays.",
    "Módulo de partidos con filtros por país, liga y equipo.",
    "Actualizaciones y mejoras continuas de la plataforma.",
  ];

  if (planLabel.includes("TRI") || planLabel.includes("ANU") || planLabel.includes("VITA")) {
    benefits.push("Uso ampliado del comparador con más combinadas disponibles.");
  }

  if (planLabel.includes("ANU") || planLabel.includes("VITA")) {
    benefits.push("Regalo físico asociado a tu plan (pelota / pelota + trofeo).");
  }

  if (planLabel.includes("VITA")) {
    benefits.push("Acceso de por vida a Factor Victoria (plan vitalicio).");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      {/* Cabecera */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">Mi perfil</h1>
        <p className="text-slate-300 text-sm md:text-base">
          Aquí verás los datos básicos de tu cuenta y el estado de tu membresía
          en <span className="font-semibold">Factor Victoria</span>.
        </p>
      </section>

      {/* Datos de la cuenta */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">
            Datos de la cuenta
          </h2>
          <dl className="space-y-2 text-sm text-slate-200">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Nombre</dt>
              <dd className="font-medium text-right">{name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Correo</dt>
              <dd className="font-medium text-right break-all">{email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Cuenta creada</dt>
              <dd className="font-medium text-right">
                {formatDate(createdAt)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Estado de la membresía */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">
            Estado de la membresía
          </h2>

          <div className="mb-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-200 border border-emerald-500/40">
              Membresía activa · {readablePlan}
            </span>
          </div>

          <dl className="space-y-2 text-sm text-slate-200 mb-3">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Plan</dt>
              <dd className="font-medium text-right">{planLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Próxima renovación</dt>
              <dd className="font-medium text-right">
                {expiresAt ? formatDate(expiresAt) : "Según tu plan actual"}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-slate-400">
            Si necesitas cambiar de plan o actualizar tus datos de pago, escríbenos
            directamente y te ayudamos con el ajuste.
          </p>
        </div>
      </section>

      {/* Beneficios del plan */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-sm md:text-base font-semibold text-slate-100 mb-3">
          Beneficios incluidos en tu plan
        </h2>
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
          {benefits.map((b, idx) => (
            <li key={idx}>{b}</li>
          ))}
        </ul>
      </section>

      {/* Documentos del plan (PDFs más adelante) */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-sm md:text-base font-semibold text-slate-100 mb-3">
          Documentos de tu membresía
        </h2>
        <p className="text-sm text-slate-300 mb-3">
          Próximamente podrás descargar un PDF con el detalle completo de tu plan
          (condiciones, beneficios y regalos físicos). Por ahora, esta sección es
          solo informativa.
        </p>

        <button
          type="button"
          disabled
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border border-slate-500/60 text-slate-300 bg-slate-900/40 opacity-70 cursor-not-allowed"
          style={{ borderColor: GOLD }}
        >
          Descarga de PDF disponible próximamente
        </button>
      </section>
    </div>
  );
}
