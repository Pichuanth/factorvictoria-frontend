// src/pages/Profile.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

/* ------------------- Theme por plan ------------------- */
function getPlanTheme(planLabel = "") {
  const p = String(planLabel || "").toUpperCase();

  // Vitalicio
  if (p.includes("VITAL")) {
    return {
      planKey: "VITALICIO",
      name: "Leyenda",
      accent: "#E6C464",
      glow: "rgba(230,196,100,0.35)",
      ring: "rgba(16,185,129,0.25)",
      badgeBg: "rgba(230,196,100,0.14)",
      badgeBorder: "rgba(230,196,100,0.35)",
      badgeText: "rgba(255,241,199,0.95)",
      hudA: "rgba(16,185,129,0.65)",
      hudB: "rgba(230,196,100,0.65)",
    };
  }

  // Anual / Campeón
  if (p.includes("ANUAL") || p.includes("CAMPE")) {
    return {
      planKey: "ANUAL",
      name: "Campeón",
      accent: "#E6C464",
      glow: "rgba(230,196,100,0.26)",
      ring: "rgba(16,185,129,0.20)",
      badgeBg: "rgba(230,196,100,0.10)",
      badgeBorder: "rgba(230,196,100,0.25)",
      badgeText: "rgba(255,241,199,0.92)",
      hudA: "rgba(16,185,129,0.55)",
      hudB: "rgba(230,196,100,0.55)",
    };
  }

  // Trimestral / Goleador
  if (p.includes("TRI") || p.includes("GOLE") || p.includes("3")) {
    return {
      planKey: "TRIMESTRAL",
      name: "Goleador",
      accent: "rgba(16,185,129,0.95)",
      glow: "rgba(16,185,129,0.22)",
      ring: "rgba(16,185,129,0.22)",
      badgeBg: "rgba(16,185,129,0.10)",
      badgeBorder: "rgba(16,185,129,0.25)",
      badgeText: "rgba(167,243,208,0.95)",
      hudA: "rgba(16,185,129,0.65)",
      hudB: "rgba(96,165,250,0.55)",
    };
  }

  // Mensual / default
  return {
    planKey: "MENSUAL",
    name: "Inicio",
    accent: "rgba(148,163,184,0.95)",
    glow: "rgba(148,163,184,0.16)",
    ring: "rgba(148,163,184,0.18)",
    badgeBg: "rgba(255,255,255,0.06)",
    badgeBorder: "rgba(255,255,255,0.12)",
    badgeText: "rgba(226,232,240,0.92)",
    hudA: "rgba(148,163,184,0.55)",
    hudB: "rgba(16,185,129,0.35)",
  };
}

/* ------------------- Avatar persistente ------------------- */
const AVATAR_KEY = "fv_profile_avatar_v1";

function getInitials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "FV";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "F";
  const b = parts[1]?.[0] || parts[0]?.[1] || "V";
  return (a + b).toUpperCase();
}

/* ------------------- Mini iconos (SVG inline) ------------------- */
function MedalIcon({ color = GOLD }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 3h8l-1.2 6.2a6.5 6.5 0 1 1-4.6 0L8 3Z"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.9"
      />
      <path
        d="M10 3l2 5 2-5"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.7"
      />
      <path
        d="M12 12.2l1.1 2.2 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3L12 12.2Z"
        fill={color}
        opacity="0.55"
      />
    </svg>
  );
}

function Chip({ children, style, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] border ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

export default function Profile() {
  const navigate = useNavigate();
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
    const raw = user?.planId || user?.plan?.id || user?.plan || user?.membership || "";
    return String(raw || "ACTIVA").toUpperCase();
  }, [user]);

  const theme = useMemo(() => getPlanTheme(planLabel), [planLabel]);

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
    reader.onload = () => setAvatarUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatarUrl("");
    if (fileRef.current) fileRef.current.value = "";
  }

  // Ruta donde tienes tus planes (ajusta si es /planes)
  const PLANS_URL = "/#planes";

  function goToPlans(targetPlan) {
    // Si quieres pasar plan por query: /#planes?plan=VITALICIO, etc.
    // Para no depender del hash, lo dejamos simple y estable.
    window.location.href = PLANS_URL + (targetPlan ? `&plan=${encodeURIComponent(targetPlan)}` : "");
  }

  function upgradeSuggestion() {
    // Simple sugerencia visual (no impone lógica real)
    if (theme.planKey === "MENSUAL") return "TRIMESTRAL";
    if (theme.planKey === "TRIMESTRAL") return "ANUAL";
    if (theme.planKey === "ANUAL") return "VITALICIO";
    return null; // vitalicio no sube
  }

  function downgradeSuggestion() {
    if (theme.planKey === "VITALICIO") return "ANUAL";
    if (theme.planKey === "ANUAL") return "TRIMESTRAL";
    if (theme.planKey === "TRIMESTRAL") return "MENSUAL";
    return null;
  }

  const suggestUp = upgradeSuggestion();
  const suggestDown = downgradeSuggestion();

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

  return (
    <div className="relative max-w-5xl mx-auto px-4 pb-20">
      {/* ------------------- Fondo Futurista HUD ------------------- */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Glow principal */}
        <div
          className="absolute -top-44 left-1/2 -translate-x-1/2 h-[640px] w-[640px] rounded-full blur-3xl opacity-25"
          style={{
            background: `radial-gradient(circle at center, ${theme.hudA}, rgba(15,23,42,0) 60%)`,
          }}
        />
        <div
          className="absolute -top-52 right-[-140px] h-[560px] w-[560px] rounded-full blur-3xl opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${theme.hudB}, rgba(15,23,42,0) 62%)`,
          }}
        />

        {/* Grid + mask */}
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(circle at 50% 18%, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 18%, black 0%, transparent 70%)",
          }}
        />

        {/* Scanlines */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(255,255,255,0.14) 1px, transparent 1px)",
            backgroundSize: "100% 10px",
            maskImage: "radial-gradient(circle at 50% 12%, black 0%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 12%, black 0%, transparent 78%)",
          }}
        />

        {/* Puntos HUD */}
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(circle at 50% 28%, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 28%, black 0%, transparent 70%)",
          }}
        />

        {/* Líneas decorativas */}
        <div
          className="absolute top-16 left-6 h-px w-[320px] opacity-25"
          style={{
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          }}
        />
        <div
          className="absolute top-28 right-8 h-px w-[360px] opacity-25"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(16,185,129,0.95), transparent)`,
          }}
        />

        {/* Micro paneles estilo HUD (decorativos) */}
        <div
          className="absolute top-36 left-6 rounded-2xl border border-white/10 bg-slate-950/20 p-3 opacity-70"
          style={{ boxShadow: `0 0 30px ${theme.glow}` }}
        >
          <div className="text-[10px] text-slate-300 tracking-widest uppercase">Status</div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="h-1 w-2 rounded-sm"
                style={{
                  background:
                    i % 3 === 0 ? theme.hudA : "rgba(255,255,255,0.10)",
                  opacity: 0.9,
                }}
              />
            ))}
          </div>
        </div>

        <div
          className="absolute top-40 right-8 rounded-2xl border border-white/10 bg-slate-950/20 p-3 opacity-70"
          style={{ boxShadow: `0 0 28px ${theme.glow}` }}
        >
          <div className="text-[10px] text-slate-300 tracking-widest uppercase">Signals</div>
          <div className="mt-2 flex items-end gap-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="w-2 rounded-sm"
                style={{
                  height: 6 + ((i * 7) % 22),
                  background:
                    i % 4 === 0 ? `rgba(230,196,100,0.65)` : "rgba(16,185,129,0.35)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ------------------- Header perfil ------------------- */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Mi perfil</h1>
            <p className="text-slate-300 text-sm md:text-base mt-1 max-w-2xl">
              Tu cuenta está conectada al panel de análisis de Factor Victoria. Personaliza tu perfil y revisa el estado de tu membresía.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip
              className="border-emerald-500/20"
              style={{
                background: "rgba(16,185,129,0.10)",
                color: "rgba(167,243,208,0.95)",
                boxShadow: "0 0 0 1px rgba(16,185,129,0.10) inset",
              }}
            >
              Membresía activa
            </Chip>

            <Chip
              className="border-white/10"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(226,232,240,0.92)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
              }}
            >
              Plan <span className="font-semibold" style={{ color: GOLD }}>{planLabel}</span>
            </Chip>

            <Chip
              style={{
                background: theme.badgeBg,
                borderColor: theme.badgeBorder,
                color: theme.badgeText,
                boxShadow: `0 0 28px ${theme.glow}`,
              }}
            >
              <MedalIcon color={theme.accent || GOLD} />
              Rango: <span className="font-semibold">{theme.name}</span>
            </Chip>
          </div>
        </div>
      </section>

      {/* ------------------- Perfil + Estado ------------------- */}
      <section className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card Avatar / Identidad */}
        <div
          className="lg:col-span-1 rounded-3xl border bg-white/5 p-5 md:p-6 relative overflow-hidden"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px ${theme.glow}`,
          }}
        >
          {/* Overlay HUD interno */}
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div
              className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-2xl"
              style={{
                background: `radial-gradient(circle at center, ${theme.hudA}, rgba(15,23,42,0) 65%)`,
              }}
            />
            <div className="absolute bottom-6 left-6 h-px w-40 opacity-25"
              style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
            />
            <div className="absolute top-10 right-6 h-px w-44 opacity-20"
              style={{ background: `linear-gradient(90deg, transparent, rgba(16,185,129,0.95), transparent)` }}
            />
          </div>

          <div className="relative">
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
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 34px rgba(16,185,129,0.14)",
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
                  className="pointer-events-none absolute -inset-2 rounded-full opacity-70 border"
                  style={{
                    borderColor: theme.ring,
                    boxShadow: `0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 30px ${theme.glow}`,
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
        </div>

        {/* Cards derecha */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-4">
          {/* Estado membresía */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div
                className="absolute -top-28 right-[-120px] h-72 w-72 rounded-full blur-2xl"
                style={{ background: `radial-gradient(circle at center, ${theme.hudB}, rgba(15,23,42,0) 65%)` }}
              />
            </div>

            <div className="relative">
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
                  <div className="mt-1 text-sm font-bold text-emerald-200">Activo</div>
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
            </div>
          </div>

          {/* Gestionar plan (reemplaza “escríbenos…”) */}
          <div
            className="rounded-3xl border bg-white/5 p-5 md:p-6"
            style={{
              borderColor: "rgba(255,255,255,0.10)",
              boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 36px ${theme.glow}`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Gestionar plan</div>
                <div className="text-xs text-slate-400 mt-1">
                  Sube o baja tu membresía directamente, sin esperar soporte.
                </div>
              </div>

              <Chip
                className="border-white/10"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(226,232,240,0.92)",
                }}
              >
                Tu nivel: <span className="font-semibold" style={{ color: theme.accent || GOLD }}>{theme.name}</span>
              </Chip>
            </div>

            <div className="mt-4 flex flex-col md:flex-row gap-2">
              <button
                type="button"
                onClick={() => goToPlans()}
                className="w-full md:w-auto px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
              >
                Ver planes
              </button>

              {suggestUp ? (
                <button
                  type="button"
                  onClick={() => goToPlans(suggestUp)}
                  className="w-full md:w-auto px-5 py-2.5 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: GOLD, color: "#0f172a" }}
                >
                  Subir a {suggestUp}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full md:w-auto px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15 bg-white/5 text-slate-400 cursor-not-allowed"
                >
                  Máximo nivel alcanzado
                </button>
              )}

              {suggestDown ? (
                <button
                  type="button"
                  onClick={() => goToPlans(suggestDown)}
                  className="w-full md:w-auto px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15 bg-slate-950/30 hover:bg-slate-950/50 transition"
                >
                  Bajar a {suggestDown}
                </button>
              ) : null}
            </div>

            <div className="mt-3 text-xs text-slate-400">
              Factor Victoria no es una casa de apuestas: es una herramienta de decisión. Tú eliges tu casa de apuestas favorita.
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
              <Chip
                className="border-white/10"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(226,232,240,0.92)" }}
              >
                Modo PRO
              </Chip>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {[
                "Acceso al comparador profesional de parlays.",
                "Módulo de partidos con filtros por país, liga y equipo.",
                "Actualizaciones y mejoras continuas de la plataforma.",
                "Más combinadas disponibles según tu plan.",
                "Regalo físico asociado a tu plan (trofeos + medallas conmemorativas).",
                "Acceso de por vida a Factor Victoria (plan vitalicio).",
              ].map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
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
