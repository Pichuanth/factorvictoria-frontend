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

  const login = async (email, _password) => {
    const e = (email || "").trim().toLowerCase();
    if (!e) return { ok: false, message: "Ingresa tu correo" };

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
