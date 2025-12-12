// src/pages/Profile.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

// Rutas de los PDF (luego las cambiarás por las URLs reales donde los subas)
const PLAN_DOCS = {
  MENSUAL: "/docs/factor_victoria_plan_mensual.pdf",
  TRIMESTRAL: "/docs/factor_victoria_plan_trimestral.pdf",
  ANUAL: "/docs/factor_victoria_plan_anual.pdf",
  VITALICIO: "/docs/factor_victoria_plan_vitalicio.pdf",
};

function normalizePlanKey(raw) {
  const t = String(raw || "").toLowerCase();

  if (t.includes("vita")) return "VITALICIO";
  if (t.includes("anu")) return "ANUAL";
  if (t.includes("tri") || t.includes("3")) return "TRIMESTRAL";
  if (t.includes("men") || t.includes("1")) return "MENSUAL";

  return "MENSUAL"; // por defecto
}

const PLAN_LABEL = {
  MENSUAL: "Plan Mensual",
  TRIMESTRAL: "Plan Trimestral",
  ANUAL: "Plan Anual",
  VITALICIO: "Plan Vitalicio",
};

export default function Profile() {
  const { user } = useAuth();

  const email = user?.email || "sin-correo@ejemplo.com";
  const name =
    user?.name ||
    user?.fullName ||
    user?.nickname ||
    email.split("@")[0] ||
    "Usuario Factor Victoria";

  const rawPlan =
    user?.planId || user?.plan?.id || user?.plan || user?.membership || "MENSUAL";

  const planKey = normalizePlanKey(rawPlan);
  const planLabel = PLAN_LABEL[planKey] || "Plan Mensual";
  const planDoc = PLAN_DOCS[planKey];

  // Aquí podrías calcular fecha de renovación si la tuvieras en user
  const renewalText =
    planKey === "VITALICIO"
      ? "Sin renovación: acceso vitalicio."
      : "Renovación automática según tu ciclo de pago.";

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* Título */}
      <section className="mt-6 mb-4">
        <h1 className="text-xl md:text-2xl font-bold mb-2">Mi perfil</h1>
        <p className="text-slate-300 text-sm md:text-base">
          Aquí verás los datos básicos de tu cuenta, tu membresía activa y los
          documentos de bienvenida asociados a tu plan.
        </p>
      </section>

      {/* Datos de cuenta */}
      <section className="mt-2 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-sm md:text-base font-semibold mb-3">
          Datos de la cuenta
        </h2>

        <dl className="space-y-2 text-sm text-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
            <dt className="text-slate-400">Nombre</dt>
            <dd className="font-medium">{name}</dd>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
            <dt className="text-slate-400">Correo</dt>
            <dd className="font-medium">{email}</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-slate-400">
          Si necesitas cambiar el correo o datos de facturación, contáctanos por
          WhatsApp o correo indicando tu plan y correo actual.
        </p>
      </section>

      {/* Información de membresía */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-sm md:text-base font-semibold mb-3">
          Tu membresía
        </h2>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-slate-300 text-sm">
              Plan actual:{" "}
              <span className="font-semibold" style={{ color: GOLD }}>
                {planLabel}
              </span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {renewalText}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-200 border border-emerald-400/40">
              Acceso al comparador profesional
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-200 border border-sky-400/40">
              Filtros avanzados de partidos
            </span>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          En la versión completa también verás aquí tu historial de pagos y
          cambios de plan.
        </p>
      </section>

      {/* Documentos del plan */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-sm md:text-base font-semibold mb-3">
          Documentos de tu plan
        </h2>

        <p className="text-slate-300 text-sm mb-3">
          Cada plan tiene un documento en PDF con las condiciones, beneficios y
          ejemplos de uso de Factor Victoria.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={planDoc}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border border-slate-300/60 bg-slate-900/40 hover:bg-slate-800 transition"
          >
            Descargar guía de tu plan (PDF)
          </a>

          <Link
            to="/app"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border border-transparent"
            style={{ backgroundColor: GOLD, color: "#0f172a" }}
          >
            Volver al comparador
          </Link>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Nota: si el PDF aún no se descarga es porque falta subir el archivo
          definitivo. Cuando tengas las URLs reales (por ejemplo, desde
          Shopify, tu servidor o S3), sólo debes reemplazar las rutas en{" "}
          <code className="text-[11px] bg-slate-900 px-1 py-0.5 rounded">
            PLAN_DOCS
          </code>{" "}
          al inicio de este archivo.
        </p>
      </section>
    </div>
  );
}
