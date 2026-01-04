// src/pages/Profile.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";
function getPlanTheme(planLabel = "") {
  const p = String(planLabel || "").toUpperCase();

  // Ajusta nombres si tu backend usa otros ids
  if (p.includes("VITAL")) {
    return {
      name: "Leyenda",
      accent: "#E6C464",           // oro
      glow: "rgba(230,196,100,0.35)",
      ring: "rgba(16,185,129,0.25)", // verde leve (como tu logo)
      badgeBg: "rgba(230,196,100,0.14)",
      badgeBorder: "rgba(230,196,100,0.35)",
      badgeText: "rgba(255,241,199,0.95)",
    };
  }

  if (p.includes("ANUAL") || p.includes("CAMPE")) {
    return {
      name: "Campeón",
      accent: "#E6C464",
      glow: "rgba(230,196,100,0.26)",
      ring: "rgba(16,185,129,0.20)",
      badgeBg: "rgba(230,196,100,0.10)",
      badgeBorder: "rgba(230,196,100,0.25)",
      badgeText: "rgba(255,241,199,0.92)",
    };
  }

  if (p.includes("TRI") || p.includes("GOLE") || p.includes("3")) {
    return {
      name: "Goleador",
      accent: "rgba(16,185,129,0.95)",     // verde
      glow: "rgba(16,185,129,0.22)",
      ring: "rgba(16,185,129,0.22)",
      badgeBg: "rgba(16,185,129,0.10)",
      badgeBorder: "rgba(16,185,129,0.25)",
      badgeText: "rgba(167,243,208,0.95)",
    };
  }

  // Mensual / Inicio / default
  return {
    name: "Inicio",
    accent: "rgba(148,163,184,0.95)",      // slate
    glow: "rgba(148,163,184,0.16)",
    ring: "rgba(148,163,184,0.18)",
    badgeBg: "rgba(255,255,255,0.06)",
    badgeBorder: "rgba(255,255,255,0.12)",
    badgeText: "rgba(226,232,240,0.92)",
  };
}

/**
 * Guardamos la foto en localStorage para que persista.
 * Si después quieres guardarlo en backend (S3 / Cloudinary),
 * lo cambiamos sin tocar el diseño.
 */
const AVATAR_KEY = "fv_profile_avatar_v1";

function getInitials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "FV";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "F";
  const b = parts[1]?.[0] || parts[0]?.[1] || "V";
  return (a + b).toUpperCase();
}

export default function Profile() {
  const { user, isLoggedIn } = useAuth();
  const fileRef = useRef(null);

  const [avatarUrl, setAvatarUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(AVATAR_KEY) || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (avatarUrl) localStorage.setItem(AVATAR_KEY, avatarUrl);
      else localStorage.removeItem(AVATAR_KEY);
    } catch {
      // ignore
    }
  }, [avatarUrl]);

  const planLabel = useMemo(() => {
    const raw =
      user?.planId || user?.plan?.id || user?.plan || user?.membership || "";
    return String(raw || "ACTIVA").toUpperCase();
  }, [user]);

  const displayName = useMemo(() => {
    return user?.name || user?.fullName || user?.email || "Usuario";
  }, [user]);

  const email = useMemo(() => {
    return user?.email || "—";
  }, [user]);

  const createdAt = useMemo(() => {
    const raw = user?.createdAt || user?.created_at || user?.created || "";
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" });
  }, [user]);

  function onPickAvatar() {
    fileRef.current?.click();
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Restricción simple
    const okType = /image\/(png|jpg|jpeg|webp)/i.test(file.type);
    if (!okType) {
      alert("Sube una imagen PNG, JPG o WEBP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert("La imagen es muy pesada (máx 3MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatarUrl("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl md:text-2xl font-bold">Perfil</h1>
          <p className="text-slate-300 mt-2">
            Para ver tu perfil y tu membresía,{" "}
            <Link to="/login" className="underline font-semibold">
              inicia sesión
            </Link>
            .
          </p>
        </section>
      </div>
    );
  }
const theme = useMemo(() => getPlanTheme(planLabel), [planLabel]);

  return (
    <div className="relative max-w-5xl mx-auto px-4 pb-20">
      {/* Fondo Futurista HUD (sin imágenes externas) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full blur-3xl opacity-25"
             style={{ background: "radial-gradient(circle at center, rgba(16,185,129,0.35), rgba(15,23,42,0) 60%)" }} />

        <div className="absolute -top-52 right-[-120px] h-[520px] w-[520px] rounded-full blur-3xl opacity-20"
             style={{ background: "radial-gradient(circle at center, rgba(230,196,100,0.30), rgba(15,23,42,0) 60%)" }} />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(circle at 50% 20%, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 20%, black 0%, transparent 70%)",
          }}
        />

        {/* Líneas HUD */}
        <div className="absolute top-16 left-6 h-px w-72 opacity-20"
             style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <div className="absolute top-28 right-8 h-px w-80 opacity-20"
             style={{ background: `linear-gradient(90deg, transparent, rgba(16,185,129,0.9), transparent)` }} />
      </div>

      {/* Header perfil */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Mi perfil</h1>
            <p className="text-slate-300 text-sm md:text-base mt-1 max-w-2xl">
              Tu cuenta está conectada al panel de análisis de Factor Victoria. Personaliza tu perfil y revisa el estado de tu membresía.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] bg-emerald-500/10 text-emerald-200 border border-emerald-500/20">
              Membresía activa
            </span>
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] border border-white/10 bg-white/5 text-slate-100"
              style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset" }}
            >
              Plan <span className="ml-1 font-semibold" style={{ color: GOLD }}>{planLabel}</span>
            </span>
          </div>
        </div>
      </section>
<span
  className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] border"
  style={{
    background: theme.badgeBg,
    borderColor: theme.badgeBorder,
    color: theme.badgeText,
    boxShadow: `0 0 28px ${theme.glow}`,
  }}
>
  Rango: <span className="ml-1 font-semibold">{theme.name}</span>
</span>

      {/* Perfil + Estado */}
      <section className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card Avatar / Datos */}
        <div
  className="lg:col-span-1 rounded-3xl border bg-white/5 p-5 md:p-6"
  style={{
    borderColor: "rgba(255,255,255,0.10)",
    boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px ${theme.glow}`,
  }}
>

          <div className="flex items-start justify-between gap-3">
            <div className="text-sm font-semibold">Identidad</div>
            <div className="text-xs text-slate-400">Personaliza tu cuenta</div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div
                className="h-20 w-20 rounded-full overflow-hidden border border-white/10 bg-slate-950/40 flex items-center justify-center"
                style={{
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 30px rgba(16,185,129,0.12)",
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-lg font-bold tracking-wide text-slate-200">
                    {getInitials(displayName)}
                  </div>
                )}
              </div>

              {/* Anillo HUD */}
              <div
  className="pointer-events-none absolute -inset-2 rounded-full opacity-70"
  style={{
  boxShadow: `0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 30px ${theme.glow}`,
  borderColor: theme.ring,
}}
/>
            </div>

            <div className="min-w-0">
              <div className="text-base font-bold truncate">{displayName}</div>
              <div className="text-xs text-slate-400 truncate">{email}</div>
              <div className="text-xs text-slate-500 mt-1">Cuenta creada: {createdAt}</div>
            </div>
          </div>

          {/* Acciones avatar */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPickAvatar}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-white/10 bg-slate-950/30 hover:bg-slate-950/50 transition"
            >
              Subir foto
            </button>

            {avatarUrl ? (
              <button
                type="button"
                onClick={removeAvatar}
                className="px-4 py-2 rounded-full text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition text-slate-200"
              >
                Quitar
              </button>
            ) : null}

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          <div className="mt-4 text-xs text-slate-400 leading-relaxed">
            Tip: usa una foto clara para que tu cuenta se sienta más personal. Esta imagen se guarda en tu dispositivo (por ahora).
          </div>
        </div>

        {/* Estado / Beneficios */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-4">
          {/* Estado membresía */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Estado de la membresía</div>
                <div className="text-xs text-slate-400 mt-1">
                  Panel de control y acceso según tu plan.
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Próxima renovación</div>
                <div className="text-sm font-semibold text-slate-100">
                  Según tu plan actual
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="text-xs text-slate-400">Acceso</div>
                <div className="mt-1 text-sm font-bold text-emerald-200">
                  Activo
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="text-xs text-slate-400">Plan</div>
                <div className="mt-1 text-sm font-bold" style={{ color: GOLD }}>
                  {planLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="text-xs text-slate-400">Soporte</div>
                <div className="mt-1 text-sm font-bold text-slate-100">
                  Prioritario
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-400">
              Si necesitas cambiar de plan o actualizar tu acceso, escríbenos y te ayudamos con el ajuste.
            </div>
          </div>

          {/* Beneficios */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Beneficios incluidos</div>
                <div className="text-xs text-slate-400 mt-1">
                  Ventajas disponibles con tu membresía.
                </div>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] bg-white/5 border border-white/10 text-slate-200">
                Modo PRO
              </span>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {[
                "Acceso al comparador profesional de parlays.",
                "Módulo de partidos con filtros por país, liga y equipo.",
                "Actualizaciones y mejoras continuas de la plataforma.",
                "Más combinadas disponibles según tu plan.",
                "Regalo físico asociado a tu plan (pelota / pelota + trofeo).",
                "Acceso de por vida a Factor Victoria (plan vitalicio).",
              ].map((b) => (
                <li key={b} className="flex gap-2">
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: GOLD }}
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Documentos */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <div className="text-sm font-semibold">Documentos de tu membresía</div>
            <p className="text-xs text-slate-400 mt-1">
              Próximamente podrás descargar un PDF con condiciones, beneficios y regalos físicos.
            </p>

            <button
              type="button"
              disabled
              className="mt-4 w-full md:w-fit px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15 bg-white/5 text-slate-300 cursor-not-allowed"
            >
              Descarga de PDF disponible próximamente
            </button>
          </div>
        </div>
      </section>

      {/* Footer mini */}
      <div className="mt-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Factor Victoria
      </div>
    </div>
  );
}
