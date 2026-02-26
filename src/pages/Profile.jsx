// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

const API_BASE =
  (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "") ||
  "https://factorvictoria-backend.vercel.app";

/* ------------------- Tier helpers (NO usar plan_id) ------------------- */
function normalizeTier(rawTier) {
  const t = String(rawTier || "").trim().toLowerCase();
  if (t === "basic" || t === "inicio") return "basic";
  if (t === "goleador" || t === "trimestral") return "goleador";
  if (t === "campeon" || t === "campeón" || t === "anual") return "campeon";
  if (t === "leyenda" || t === "vitalicio" || t === "lifetime" || t === "vip") return "leyenda";
  return "basic";
}

function tierLabel(tier) {
  switch (normalizeTier(tier)) {
    case "basic":
      return "Inicio";
    case "goleador":
      return "Goleador";
    case "campeon":
      return "Campeón";
    case "leyenda":
      return "Leyenda";
    default:
      return "Inicio";
  }
}

function upgradeSuggestion(tier) {
  const t = normalizeTier(tier);
  if (t === "basic") return { label: "Subir a TRIMESTRAL", nextTier: "goleador", planKey: "trimestral" };
  if (t === "goleador") return { label: "Subir a ANUAL", nextTier: "campeon", planKey: "anual" };
  if (t === "campeon") return { label: "Subir a VITALICIO", nextTier: "leyenda", planKey: "vitalicio" };
  return null; // leyenda
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-CL", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return String(iso);
  }
}

/* ------------------- Component ------------------- */
export default function Profile() {
  const nav = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const email = useMemo(() => {
    const e = user?.email || user?.user?.email || "";
    return String(e || "").trim().toLowerCase();
  }, [user]);

  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState(null);
  const [active, setActive] = useState(false);
  const [docs, setDocs] = useState([]);
  const [err, setErr] = useState("");
  const [cancelMsg, setCancelMsg] = useState("");

  const tier = normalizeTier(membership?.tier);
  const planId = membership?.plan_id || "—";
  const suggestUp = upgradeSuggestion(tier);

  useEffect(() => {
    if (!isLoggedIn) {
      nav("/login");
      return;
    }
  }, [isLoggedIn, nav]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!email) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr("");
      setCancelMsg("");

      try {
        const r = await fetch(`${API_BASE}/api/membership?email=${encodeURIComponent(email)}`);
        const data = await r.json();
        if (cancelled) return;

        setMembership(data?.membership || null);
        setActive(Boolean(data?.active));

        // PDFs
        try {
          const pr = await fetch(`${API_BASE}/api/pdfs?email=${encodeURIComponent(email)}`);
          const pdata = await pr.json();
          if (!cancelled) setDocs(Array.isArray(pdata?.docs) ? pdata.docs : []);
        } catch {
          if (!cancelled) setDocs([]);
        }
      } catch (e) {
        if (!cancelled) setErr("No se pudo cargar tu perfil. Intenta nuevamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [email]);

  const badge = useMemo(() => {
    if (!membership) return { text: "Sin membresía", tone: "bg-white/5 border-white/10 text-white/70" };
    if (active) return { text: "Membresía activa", tone: "bg-emerald-500/10 border-emerald-400/30 text-emerald-200" };
    return { text: "Inactiva", tone: "bg-amber-500/10 border-amber-400/30 text-amber-200" };
  }, [membership, active]);

  const headerPlan = useMemo(() => {
    // Solo estética. La lógica SIEMPRE por tier.
    const t = normalizeTier(membership?.tier);
    const priceMap = { basic: "19990", goleador: "44990", campeon: "99990", leyenda: "249990" };
    return `${t.toUpperCase()}-${priceMap[t] || "—"}`;
  }, [membership]);

  return (
    <div className="min-h-screen bg-[#050913] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">Mi perfil</h1>
              <p className="text-white/60 mt-1">
                Tu cuenta está conectada al panel de análisis de Factor Victoria. Revisa tu estado y documentos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-sm border ${badge.tone}`}>{badge.text}</span>
              <span className="px-3 py-1.5 rounded-full text-sm border border-white/10 bg-white/5">
                Plan <span className="ml-2 font-semibold" style={{ color: GOLD }}>{headerPlan}</span>
              </span>
              <span className="px-3 py-1.5 rounded-full text-sm border border-white/10 bg-white/5">
                Rango: <span className="ml-2 font-semibold">{tierLabel(tier)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-extrabold">
                {(email?.[0] || "F").toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-white/60">Identidad</div>
                <div className="font-semibold truncate">{email || "—"}</div>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                className="w-full rounded-full px-5 py-2.5 text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
                onClick={() => alert("Subir foto: pendiente (cosmético).")}
              >
                Subir foto
              </button>
              <div className="text-xs text-white/50 mt-3">
                Tip: usa una foto clara para que tu cuenta se sienta más personal.
              </div>
            </div>
          </div>

          {/* Membership state */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-sm text-white/60">Estado de la Membresía</div>
                <div className="text-lg font-bold mt-1">
                  Rango: <span style={{ color: GOLD }}>{tierLabel(tier)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 min-w-[160px]">
                  <div className="text-xs text-white/50">Acceso</div>
                  <div className="font-semibold">{active ? "Activo" : "Inactivo"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 min-w-[160px]">
                  <div className="text-xs text-white/50">Plan</div>
                  <div className="font-semibold">{planId}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 min-w-[160px]">
                  <div className="text-xs text-white/50">Vigencia</div>
                  <div className="font-semibold">
                    {membership?.end_at ? formatDate(membership.end_at) : "Sin término"}
                  </div>
                </div>
              </div>
            </div>

            {err ? (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {err}
              </div>
            ) : null}

            {/* Manage plan */}
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-sm text-white/60">Gestionar plan</div>
                  <div className="text-white/80 mt-1">Sube tu membresía sin esperar soporte.</div>
                </div>
                <span className="px-3 py-1.5 rounded-full text-sm border border-white/10 bg-white/5">
                  Tu nivel: <span className="ml-2 font-semibold">{tierLabel(tier)}</span>
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/checkout"
                  className="px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
                >
                  Ver planes
                </Link>

                {suggestUp ? (
                  <Link
                    to={`/checkout?plan=${encodeURIComponent(suggestUp.planKey)}`}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15"
                    style={{ backgroundColor: GOLD, color: "#0b1020" }}
                  >
                    {suggestUp.label}
                  </Link>
                ) : null}

                {membership?.cancel_at_period_end ? (
                  <span className="px-5 py-2.5 rounded-full text-sm font-semibold border border-amber-400/30 bg-amber-500/10 text-amber-200">
                    Cancelación programada (hasta término)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setCancelMsg("");
                        const r = await fetch(`${API_BASE}/api/membership`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email, action: "cancel" }),
                        });
                        const data = await r.json();
                        if (data?.ok) {
                          setMembership(data.membership || null);
                          setActive(Boolean(data?.active));
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
                    className="px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
                  >
                    Cancelar suscripción
                  </button>
                )}
              </div>

              {cancelMsg ? <div className="mt-3 text-sm text-white/70">{cancelMsg}</div> : null}
            </div>

            {/* Documents */}
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-bold">Documentos de tu membresía</h2>

              {loading ? (
                <p className="text-white/60 mt-2">Cargando…</p>
              ) : docs?.length ? (
                <ul className="mt-3 space-y-2">
                  {docs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3">
                      <span className="text-white/85">{d.title}</span>
                      <a
                        className="px-4 py-2 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
                        href={`${API_BASE}/api/pdfs?email=${encodeURIComponent(email)}&docId=${encodeURIComponent(d.id)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Descargar
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/60 mt-2">No hay documentos disponibles para tu plan.</p>
              )}
            </div>

            {/* Benefits */}
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Beneficios incluidos</h2>
                <span className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5">Modo PRO</span>
              </div>
              <ul className="mt-3 space-y-2 text-white/75">
                <li>• Acceso al comparador profesional de parlays.</li>
                <li>• Módulo de partidos con filtros por país, liga y equipo.</li>
                <li>• Más combinadas disponibles según tu plan.</li>
                <li>• Regalos físicos asociados a tu plan (según condiciones).</li>
                <li>• Actualizaciones y mejoras continuas de la plataforma.</li>
              </ul>
            </div>

            <div className="mt-8 text-center text-xs text-white/50">
              © {new Date().getFullYear()} Factor Victoria
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
