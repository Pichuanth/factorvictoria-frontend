// src/lib/auth.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const PLAN_RANK = {
  BASIC: "BASIC",        // $19.990 → x10
  PRO: "PRO",            // $44.990 → x20
  POPULAR: "POPULAR",    // $99.990 → x50 (Anual)
  VITALICIO: "VITALICIO" // $249.990 → x100
};

// DEMO: emails y plan. Password demo: Factor1986?
const DEMO_USERS = [
  { email: "basico@demo.cl",     rank: PLAN_RANK.BASIC },
  { email: "trimestral@demo.cl", rank: PLAN_RANK.PRO },
  { email: "anual@demo.cl",      rank: PLAN_RANK.POPULAR },
  { email: "vitalicio@demo.cl",  rank: PLAN_RANK.VITALICIO },
];

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

  const signIn = async (email, password) => {
    const okPass = password === "Factor1986?";
    const found = DEMO_USERS.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
    if (!found || !okPass) {
      throw new Error("Credenciales inválidas");
    }
    const logged = { email: found.email, rank: found.rank, ts: Date.now() };
    setUser(logged);
    localStorage.setItem(LS_KEY, JSON.stringify(logged));
    return logged;
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem(LS_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      getUser: () => user,
      signIn,
      signOut,
    }),
    [user]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
