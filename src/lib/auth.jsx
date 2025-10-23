// src/lib/auth.jsx
import React, { createContext, useContext, useMemo, useState } from "react";

/** Orden/jerarquía de planes (0 = más bajo) */
export const PLAN_RANK = {
  basic: 0,        // $19.990 x10
  trimestral: 1,   // $44.990 x20
  anual: 2,        // $99.990 x50
  vitalicio: 3,    // $249.990 x100
};

/** Usuarios demo por plan (misma clave para todos) */
const USERS = {
  "mensual@demo.cl":    { email: "mensual@demo.cl",    planId: "basic",     rank: PLAN_RANK.basic,     name: "Demo Mensual" },
  "trimestral@demo.cl": { email: "trimestral@demo.cl", planId: "trimestral",rank: PLAN_RANK.trimestral,name: "Demo Trimestral" },
  "anual@demo.cl":      { email: "anual@demo.cl",      planId: "anual",     rank: PLAN_RANK.anual,     name: "Demo Anual" },
  "vitalicio@demo.cl":  { email: "vitalicio@demo.cl",  planId: "vitalicio", rank: PLAN_RANK.vitalicio, name: "Demo Vitalicio" },
};
const DEMO_PASS = "Factor1986?";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("fv:user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const value = useMemo(() => {
    const login = (email, pass) => {
      const key = String(email || "").trim().toLowerCase();
      const u = USERS[key];
      if (!u || pass !== DEMO_PASS) return false;
      setUser(u);
      try { localStorage.setItem("fv:user", JSON.stringify(u)); } catch {}
      return true;
    };

    const logout = () => {
      setUser(null);
      try { localStorage.removeItem("fv:user"); } catch {}
    };

    return {
      user,
      isLoggedIn: !!user,
      getUser: () => user,
      login,
      logout,
    };
  }, [user]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
