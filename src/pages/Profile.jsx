// src/pages/Profile.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

const API_BASE =
  (import.meta.env.VITE_API_BASE || "").replace(/\/\/$/, "") ||
  "https://factorvictoria-backend.vercel.app";

/* ------------------- Helpers de plan ------------------- */
function getSupportLabel(planLabel = "") {
  const p = String(planLabel || "").toUpperCase();
  if (p.includes("VITAL")) return "Prioritario";
  if (p.includes("ANUAL") || p.includes("CAMPE")) return "VIP";
  if (p.includes("TRI") || p.includes("GOLE") || p.includes("3")) return "Pro";
  return "Estándar";
}

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


function normalizeTier(rawTier) {
  const t = String(rawTier || "").trim().toLowerCase();
  if (["basic", "goleador", "campeon", "leyenda"].includes(t)) return t;
  if (t === "vip" || t === "lifetime") return "leyenda";
  if (t === "pro") return "campeon";
  return "basic";
}

function planLabelFromTier(tier) {
  if (tier === "leyenda") return "VITALICIO-249990";
  if (tier === "campeon") return "ANUAL-99990";
  if (tier === "goleador") return "TRIMESTRAL-44990";
  return "MENSUAL-19990";
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

/* ------------------- Mini UI ------------------- */
function MedalIcon({ color = GOLD }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 3h8l-1.2 6.2a6.5 6.5 0 1 1-4.6 0L8 3Z"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.9"
      />
      <path d="M10 3l2 5 2-5" stroke={color} strokeWidth="1.5" opacity="0.7" />
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

/**
 * ✅ HudCard (estilo Perfil / “tarjeta flotante”)
 * - Borde neutro limpio
 * - Profundidad (sombra) para efecto flotante
 * - Glow dorado suave opcional
 * - Overlays + filtro de imagen (como Perfil)
 * - Permite bg (imagen) o bgColor (color sólido)
 */
function HudCard({
  bg,
  bgColor, // opcional: para color sólido (ej #132A23)
  children,
  className = "",
  style = {},
  overlayVariant = "casillas", // "casillas" | "casillasSharp" | "player"
  glow = "gold", // "gold" | "none"
  imgStyle = {}, // opcional
}) {
  const variants = {
    player: {
      overlays: [
        "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.68) 52%, rgba(2,6,23,0.40) 78%, rgba(2,6,23,0.25) 100%)",
        "radial-gradient(circle at 20% 45%, rgba(16,185,129,0.20), rgba(2,6,23,0) 58%)",
        "radial-gradient(circle at 82% 50%, rgba(230,196,100,0.18), rgba(2,6,23,0) 58%)",
      ],
      imgFilter: "contrast(1.12) saturate(1.08) brightness(0.95)",
    },

    casillas: {
      overlays: [
        "linear-gradient(180deg, rgba(2,6,23,0.88) 0%, rgba(2,6,23,0.62) 38%, rgba(2,6,23,0.86) 100%)",
        "radial-gradient(circle at 18% 30%, rgba(16,185,129,0.18), rgba(2,6,23,0) 60%)",
        "radial-gradient(circle at 85% 60%, rgba(230,196,100,0.14), rgba(2,6,23,0) 60%)",
      ],
      imgFilter: "contrast(1.10) saturate(1.06) brightness(0.96)",
    },

    // ✅ si quieres menos “neblina” y más textura visible
    casillasSharp: {
      overlays: [
        "linear-gradient(180deg, rgba(2,6,23,0.78) 0%, rgba(2,6,23,0.45) 42%, rgba(2,6,23,0.78) 100%)",
        "radial-gradient(circle at 18% 30%, rgba(16,185,129,0.14), rgba(2,6,23,0) 62%)",
        "radial-gradient(circle at 85% 60%, rgba(230,196,100,0.10), rgba(2,6,23,0) 62%)",
      ],
      imgFilter: "contrast(1.18) saturate(1.10) brightness(0.97)",
    },
  };

  const v = variants[overlayVariant] || variants.casillas;
  const [o1, o2, o3] = v.overlays;

  // ✅ borde tipo Perfil (más limpio)
  const borderColor = "rgba(255,255,255,0.10)";

  // ✅ sombra + glow tipo “tarjeta flotante” (como Perfil)
  const boxShadow =
    glow === "gold"
      ? [
          "0 0 0 1px rgba(255,255,255,0.03) inset",
          "0 18px 60px rgba(0,0,0,0.55)",     // profundidad (flotante)
          "0 0 70px rgba(230,196,100,0.18)",  // glow dorado suave
        ].join(", ")
      : [
          "0 0 0 1px rgba(255,255,255,0.05) inset",
          "0 18px 60px rgba(0,0,0,0.55)",
        ].join(", ");

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-slate-950/25 backdrop-blur-md ${className}`}
      style={{
        borderColor,
        boxShadow,
        backgroundColor: bgColor || undefined,
        ...style,
      }}
    >
      {bg ? (
        <img
          src={bg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: v.imgFilter, ...imgStyle }}
        />
      ) : null}

      <div className="absolute inset-0" style={{ background: o1 }} />
      <div className="absolute inset-0" style={{ background: o2 }} />
      <div className="absolute inset-0" style={{ background: o3 }} />

      <div className="relative">{children}</div>
    </div>
  );
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

  // Membership real (fuente de verdad)
  const [membershipInfo, setMembershipInfo] = useState(null);
  const [docs, setDocs] = useState([]);
  const [cancelMsg, setCancelMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isLoggedIn) return;
      const em = String(user?.email || "").trim();
      if (!em) return;

      try {
        const r = await fetch(`${API_BASE}/api/membership?email=${encodeURIComponent(em)}`);
        const data = await r.json();
        if (!cancelled && data?.ok) setMembershipInfo(data.membership || null);
      } catch {}

      try {
        const r2 = await fetch(`${API_BASE}/api/pdfs?email=${encodeURIComponent(em)}`);
        const data2 = await r2.json();
        if (!cancelled && data2?.ok) setDocs(data2.docs || []);
      } catch {}
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.email]);

  const tier = useMemo(() => normalizeTier(membershipInfo?.tier || user?.tier), [membershipInfo, user]);

  const planLabel = useMemo(() => {
    // Evita inconsistencias: el plan mostrado depende SOLO del tier real
    return planLabelFromTier(tier);
  }, [tier]);

  const theme = useMemo(() => getPlanTheme(planLabel), [planLabel]);

  const displayName = useMemo(() => user?.name || user?.fullName || user?.email || "Usuario", [user]);
  const email = useMemo(() => user?.email || "—", [user]);

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

  const PLANS_URL = "/#planes";
  function goToPlans(targetPlan) {
    window.location.href = PLANS_URL + (targetPlan ? `&plan=${encodeURIComponent(targetPlan)}` : "");
  }

  function upgradeSuggestion() {
    if (theme.planKey === "MENSUAL") return "TRIMESTRAL";
    if (theme.planKey === "TRIMESTRAL") return "ANUAL";
    if (theme.planKey === "ANUAL") return "VITALICIO";
    return null;
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

  // Fondos (en /public)
  const BG_PROFILE = "/hero-fondo-casillas.png";
  const BG_STATUS = "/hero-fondo-casillas.png";
  const BG_CASILLAS = "/hero-fondo-casillas.png";
  const BG_DOCS = "/hero-profile-hud.png";

  return (
    <div className="relative max-w-5xl mx-auto px-4 pb-20">
      {/* Fondo general suave */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-44 left-1/2 -translate-x-1/2 h-[640px] w-[640px] rounded-full blur-3xl opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${theme.hudA}, rgba(15,23,42,0) 60%)`,
          }}
        />
        <div
          className="absolute -top-52 right-[-140px] h-[560px] w-[560px] rounded-full blur-3xl opacity-16"
          style={{
            background: `radial-gradient(circle at center, ${theme.hudB}, rgba(15,23,42,0) 62%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(circle at 50% 18%, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 18%, black 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Mi perfil */}
      <HudCard
        bg={BG_PROFILE}
        overlayVariant="casillasSharp"
        className="mt-6"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 46px ${theme.glow}` }}
        imgPosition="center"
      >
        <div className="p-5 md:p-7">
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
        </div>
      </HudCard>

      {/* Grid */}
      <section className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Identidad (vuelve hero-fondo-casillas.png) */}
        <HudCard
          bg={BG_CASILLAS}
          overlayVariant="casillasSharp"
          className="lg:col-span-1"
          style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px ${theme.glow}` }}
          imgPosition="center"
        >
          <div className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold">Identidad</div>
              <div className="text-xs text-slate-300">Personaliza tu cuenta</div>
            </div>

            <div className="mt-4 flex items-center gap-4">
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
                <div className="text-xs text-slate-300 truncate">{email}</div>
                <div className="text-xs text-slate-300 mt-1">Cuenta creada: {createdAt}</div>
              </div>
            </div>

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

            <div className="mt-4 text-xs text-slate-300 leading-relaxed">
              Tip: usa una foto clara para que tu cuenta se sienta más personal.
            </div>
          </div>
        </HudCard>

        {/* Panel derecho */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-4">
          {/* Estado membresía */}
          <HudCard
            bg={BG_STATUS}
            overlayVariant="casillasSharp"
            style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 44px ${theme.glow}` }}
            imgPosition="center"
          >
            <div className="p-5 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="text-sm md:text-base font-semibold text-slate-100">
                    Estado de la <span style={{ color: theme.accent }}>Membresía</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1 max-w-md">
                    Revisa tu estado en tiempo real.
                  </div>

                  <div className="mt-3">
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
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 md:min-w-[260px]">
                  {[
                    { label: "Acceso", value: "Activo", color: "rgba(167,243,208,0.95)" },
                    { label: "Plan", value: planLabel, color: theme.accent },
                    { label: "Soporte", value: getSupportLabel(planLabel), color: "rgba(226,232,240,0.92)" },
                  ].map((x) => (
                    <div
                      key={x.label}
                      className="rounded-2xl border px-4 py-3"
                      style={{
                        borderColor: "rgba(255,255,255,0.12)",
                        background: "rgba(2,6,23,0.35)",
                        boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset`,
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      <div className="text-xs text-slate-300">{x.label}</div>
                      <div className="mt-0.5 text-sm font-bold" style={{ color: x.color }}>
                        {x.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </HudCard>

          {/* Gestionar plan (vuelve hero-fondo-casillas.png) */}
          <HudCard
            bg={BG_CASILLAS}
            overlayVariant="casillasSharp"
            style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px ${theme.glow}` }}
            imgPosition="center"
          >
            <div className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Gestionar plan</div>
                  <div className="text-xs text-slate-300 mt-1">Maneja tus preferencias.</div>
                </div>

                <Chip
                  className="border-white/10"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(226,232,240,0.92)",
                  }}
                >
                  Tu nivel:{" "}
                  <span className="font-semibold" style={{ color: theme.accent || GOLD }}>
                    {theme.name}
                  </span>
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
                    style={{ backgroundColor: GOLD, color: "#0f172a", boxShadow: `0 0 26px ${theme.glow}` }}
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


              <div className="mt-3 flex flex-col md:flex-row gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setCancelMsg("");
                      const em = String(user?.email || "").trim();
                      if (!em) {
                        setCancelMsg("No se encontró tu correo. Vuelve a iniciar sesión.");
                        return;
                      }
                      const r = await fetch(`${API_BASE}/api/membership`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: em, action: "cancel" }),
                      });
                      const data = await r.json();
                      if (data?.ok) {
                        setMembershipInfo(data.membership || null);
                        setCancelMsg(
                          "Suscripción cancelada al fin del período (mantienes acceso hasta la fecha de término)."
                        );
                      } else {
                        setCancelMsg("No se pudo cancelar. Intenta nuevamente.");
                      }
                    } catch {
                      setCancelMsg("No se pudo cancelar. Intenta nuevamente.");
                    }
                  }}
                  className="w-full md:w-auto px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
                >
                  Cancelar suscripción
                </button>
              </div>

              {cancelMsg ? <div className="mt-2 text-sm text-slate-300">{cancelMsg}</div> : null}

              <div className="mt-3 text-xs text-slate-300">
                Sube o baja tu membresía directamente, sin esperar soporte.
              </div>
            </div>
          </HudCard>

          {/* Beneficios (vuelve hero-fondo-casillas.png) */}
          <HudCard
            bg={BG_CASILLAS}
            overlayVariant="casillasSharp"
            style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 36px ${theme.glow}` }}
            imgPosition="center"
          >
            <div className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Beneficios incluidos</div>
                  <div className="text-xs text-slate-300 mt-1">Ventajas disponibles con tu membresía.</div>
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
          </HudCard>

          {/* Documentos (jugador) — con encuadre para NO cortar cabeza */}
          {/* Documentos (jugador) */}
<HudCard
  bg={BG_DOCS}
  overlayVariant="player"
  className="min-h-[260px] md:min-h-[280px]"
  style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 44px ${theme.glow}` }}
  imgPosition="50% 18%"
>
  <div className="p-5 md:p-6 flex flex-col min-h-[260px] md:min-h-[280px]">
    <div>
      <div className="text-sm font-semibold">Documentos de tu membresía</div>
      <p className="text-xs text-slate-300 mt-1">Accede a los documentos disponibles según tu plan.</p>
    </div>

    {/* Contenido */}
    <div className="mt-4">
      {docs?.length ? (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3"
            >
              <span className="text-sm text-slate-200">{d.title}</span>
              <a
                className="px-4 py-2 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
                href={`${API_BASE}/api/pdfs?email=${encodeURIComponent(String(user?.email || "").trim())}&docId=${encodeURIComponent(
                  d.id
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Descargar
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-slate-300">No hay documentos disponibles para tu plan.</div>
      )}
    </div>
    </div>
  </div>
</HudCard>
        </div>
      </section>

      <div className="mt-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Factor Victoria
      </div>
    </div>
  );
}
