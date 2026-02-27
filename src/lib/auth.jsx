// src/lib/auth.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthCtx = createContext(null);

// Plan rank used to gate features in UI
const PLAN_RANK = {
  mensual: 0,
  basic: 0,
  trimestral: 1,
  anual: 2,
  vitalicio: 3,
};

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Persisted user (email + plan) so refresh doesn't log out
const STORAGE_KEY = "fv_user_v1";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Restore session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.email) {
          setUser(u);
          setIsLoggedIn(true);
        }
      }
    } catch {}
  }, []);

const login = async (email, password) => {
  const e = (email || "").trim().toLowerCase();
  const pw = (password || "").trim();
  if (!e) return { ok: false, message: "Ingresa tu correo" };

  // 1) Intentar auth/login (si existe). Soporta password obligatorio luego de activar cuenta.
  try {
    const r = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e, password: pw }),
    });

    // Si el backend viejo no tiene /api/auth/login, cae al método anterior.
    if (r.status !== 404) {
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) return { ok: false, message: data?.error || "No se pudo iniciar sesión" };

      const planId = data?.membership?.plan_id || data?.planId || "mensual";
      const tier = data?.membership?.tier || data?.tier || (planId === "mensual" ? "basic" : "pro");
      const u = { email: e, planId, tier, rank: PLAN_RANK[planId] ?? 0 };
      setUser(u);
      setIsLoggedIn(true);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      } catch {}
      return { ok: true };
    }
  } catch (err) {
    // ignore and try fallback
  }

  // 2) Fallback: método anterior por /api/membership (sin password)
  try {
    const url = `${API_BASE}/api/membership?email=${encodeURIComponent(e)}`;
    const r = await fetch(url, { method: "GET" });
    const data = await r.json();

    if (!data?.ok) return { ok: false, message: "Error consultando membresía" };
    if (!data?.active) return { ok: false, message: "Tu membresía no está activa aún" };

    const planId = data?.membership?.plan_id || "mensual";
    const tier = data?.membership?.tier || (planId === "mensual" ? "basic" : "pro");

    const u = { email: e, planId, tier, rank: PLAN_RANK[planId] ?? 0 };
    setUser(u);
    setIsLoggedIn(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {}
    return { ok: true };
  } catch (err) {
    return { ok: false, message: "No se pudo conectar al servidor" };
  }
};
  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const value = useMemo(
    () => ({
      user,
      isLoggedIn,
      login,
      logout,
      PLAN_RANK,
    }),
    [user, isLoggedIn]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}