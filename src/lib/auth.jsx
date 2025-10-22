// src/lib/auth.jsx
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

/** Catalogo de planes */
export const PLAN_RANK = {
  BASIC: 0,      // $19.990
  TRIM: 1,       // $44.990
  ANUAL: 2,      // $99.990
  VITA: 3,       // $249.990
};

const DEMO_USERS = [
  { email: "basico@demo.cl",     password: "Factor1986?", rank: PLAN_RANK.BASIC, planId: "basic" },
  { email: "trimestral@demo.cl", password: "Factor1986?", rank: PLAN_RANK.TRIM,  planId: "trim"  },
  { email: "anual@demo.cl",      password: "Factor1986?", rank: PLAN_RANK.ANUAL, planId: "anual" },
  { email: "vitalicio@demo.cl",  password: "Factor1986?", rank: PLAN_RANK.VITA,  planId: "vita"  },
];

const STORAGE_KEY = "fv_user";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // cargar sesión guardada
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  // helpers
  const login = (email, password) => {
    const found = DEMO_USERS.find(u => u.email === email && u.password === password);
    if (!found) return false;
    const packed = { email: found.email, rank: found.rank, planId: found.planId };
    setUser(packed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packed));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({
    user,
    isLoggedIn: !!user,
    rank: user?.rank ?? null,
    planId: user?.planId ?? null,
    login,
    logout,
  }), [user]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
