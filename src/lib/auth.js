// src/lib/auth.js
import React, { createContext, useContext, useMemo, useState } from "react";

/** Planes */
export const PLAN = {
  BASIC: 1,        // $19.990  -> x10
  QUARTERLY: 2,    // $44.990  -> x20
  ANNUAL: 3,       // $99.990  -> x50
  LIFETIME: 4,     // $249.990 -> x100
};

export const PLAN_INFO = {
  [PLAN.BASIC]:     { name: "BÁSICO",     multiplier: 10,  slug: "x10"  },
  [PLAN.QUARTERLY]: { name: "TRIMESTRAL", multiplier: 20,  slug: "x20"  },
  [PLAN.ANNUAL]:    { name: "ANUAL",      multiplier: 50,  slug: "x50"  },
  [PLAN.LIFETIME]:  { name: "VITALICIO",  multiplier: 100, slug: "x100" },
};

/** DEMO users (correo/clave) */
const USERS = {
  "basico@demo.cl":     { password: "Factor1986?", planId: PLAN.BASIC },
  "trimestral@demo.cl": { password: "Factor1986?", planId: PLAN.QUARTERLY },
  "anual@demo.cl":      { password: "Factor1986?", planId: PLAN.ANNUAL },
  "vitalicio@demo.cl":  { password: "Factor1986?", planId: PLAN.LIFETIME },
};

const LS_KEY = "fv_user";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = (email, password) => {
    const u = USERS[email?.toLowerCase().trim()];
    if (!u || u.password !== password) return false;
    const payload = { email, planId: u.planId };
    setUser(payload);
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LS_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      planId: user?.planId ?? null,
      plan: user ? PLAN_INFO[user.planId] : null,
      login,
      logout,
    }),
    [user]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider/>");
  return ctx;
}
