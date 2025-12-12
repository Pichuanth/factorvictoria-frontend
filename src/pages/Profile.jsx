// src/pages/Profile.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

/* ---------- helpers ---------- */

function getPlanLabelFromUser(user) {
  const raw =
    user?.planId ||
    user?.plan?.id ||
    user?.plan ||
    user?.membership ||
    "";

  return String(raw || "").toUpperCase();
}

function getPlanMeta(planLabel) {
  const p = String(planLabel || "").toUpperCase();

  if (p.includes("VITA")) {
    return {
      name: "Vitalicio",
      maxBoost: 100,
      pdfFile: "factor_victoria_plan_vitalicio.pdf",
    };
  }

  if (p.includes("ANU")) {
    return {
      name: "Anual",
      maxBoost: 50,
      pdfFile: "factor_victoria_plan_anual.pdf",
    };
  }

  if (p.includes("TRI") || p.includes("3")) {
    return {
      name: "Trimestral",
      maxBoost: 20,
      pdfFile: "factor_victoria_plan_trimestral.pdf",
    };
  }

  // Por defecto: mensual
  return {
    name: "Mensual",
    maxBoost: 10,
    pdfFile: "factor_victoria_plan_mensual.pdf",
  };
}

export default function Profile() {
  const { user } = useAuth();

  const planLabel = useMemo(
    () => getPlanLabelFromUser(user),
    [user]
  );

  const planMeta = useMemo(
    () => getPlanMeta(planLabel),
    [planLabel]
  );

  // Ruta donde luego pondrás los PDF (por ejemplo en /public/docs/...)
  const pdfHref = `/docs/${planMeta.pdfFile}`;

  const email =
    user?.email ||
    user?.mail ||
    user?.username ||
    "sin correo registrado";

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.displayName ||
    "Cuenta Factor Victoria";

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* Cabecera */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">
          Mi perfil
        </h1>
        <p className="text-slate-300 text-sm md:text-base">
          Revisa los datos de tu cuenta, tu membresía actual y
          descarga el PDF con el detalle de tu plan Factor Victoria.
        </p>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Datos de la cuenta */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <h2 className="text-sm md:text-base font-semibold mb-3">
            Datos de la cuenta
          </h2>

          <dl className="space-y-2 text-sm text-slate-200">
            <div>
              <dt className="text-xs uppercase text-slate-400">
                Nombre
              </dt>
              <dd className="font-medium">{displayName}</dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-slate-400">
                Correo
              </dt>
              <dd className="font-medium break-all">{email}</dd>
            </div>

            <div>
              <dt className="text-xs uppercase text-slate-400">
                Identificador interno
              </dt>
              <dd className="text-xs text-slate-400">
                {user?.id || user?._id || "pendiente de sincronizar"}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-[11px] text-slate-400">
            Si necesitas actualizar estos datos (correo o nombre),
            contáctanos por el canal oficial de soporte de Factor
            Victoria.
          </p>
        </section>

        {/* Información de la membresía */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <h2 className="text-sm md:text-base font-semibold mb-3">
            Mi membresía
          </h2>

          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-3"
            style={{ backgroundColor: "rgba(230,196,100,0.12)", color: GOLD }}
          >
            Plan {planMeta.name.toUpperCase()}
            <span className="ml-2 text-[11px] text-slate-100">
              (máx. combinadas x{planMeta.maxBoost})
            </span>
          </div>

          <ul className="text-sm text-slate-200 space-y-1">
            <li>
              • Acceso al comparador profesional con filtros por
              país, liga y equipo.
            </li>
            <li>
              • Combinadas simuladas hasta{" "}
              <span className="font-semibold">
                x{planMeta.maxBoost}
              </span>{" "}
              según tu plan.
            </li>
            <li>
              • Acceso al módulo de Partidos con horarios en tu
              zona horaria.
            </li>
            <li>
              • Soporte prioritario para dudas sobre el uso de la
              plataforma.
            </li>
          </ul>

          <p className="mt-4 text-[11px] text-slate-400">
            Más adelante podrás ver aquí también la fecha de
            contratación, próxima renovación y facturas asociadas a
            tu plan.
          </p>
        </section>
      </div>

      {/* Descarga de PDF del plan */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
        <h2 className="text-sm md:text-base font-semibold mb-3">
          Documentos de mi membresía
        </h2>

        <p className="text-sm text-slate-200 mb-3">
          Aquí podrás descargar el resumen oficial de tu plan
          Factor Victoria en formato PDF. Te recomendamos guardarlo
          para tener siempre claro qué incluye tu membresía.
        </p>

        <div className="flex flex-wrap gap-2">
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border border-white/15 bg-white/10 hover:bg-white/20 transition"
            style={{ color: "#0f172a", backgroundColor: GOLD }}
          >
            Descargar PDF de mi plan ({planMeta.name})
          </a>

          <Link
            to="/app"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border border-slate-600/60 text-slate-100 bg-slate-900/40 hover:bg-slate-800 transition"
          >
            Volver al comparador
          </Link>
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          Para que el enlace funcione, coloca los archivos PDF
          <code className="mx-1 text-[10px] bg-slate-900 px-1 py-0.5 rounded">
            factor_victoria_plan_*.pdf
          </code>
          dentro de la carpeta{" "}
          <code className="text-[10px] bg-slate-900 px-1 py-0.5 rounded">
            public/docs
          </code>{" "}
          de tu proyecto.
        </p>
      </section>
    </div>
  );
}
