// src/lib/auth.jsx
export { useAuth, AuthProvider, login, logout } // según tengas
export const PLAN_RANK = {
  basic: 0,
  trimestral: 1,
  anual: 2,
  vitalicio: 3,
};

/* ===== Usuarios demo por plan ===== */
const USERS = {
  "mensual@demo.cl":   { email: "mensual@demo.cl",   planId: "basic",     rank: "basic",     name: "Demo Mensual" },
  "trimestral@demo.cl":{ email: "trimestral@demo.cl",planId: "trimestral",rank: "trimestral",name: "Demo Trimestral" },
  "anual@demo.cl":     { email: "anual@demo.cl",     planId: "anual",     rank: "anual",     name: "Demo Anual" },
  "vitalicio@demo.cl": { email: "vitalicio@demo.cl", planId: "vitalicio", rank: "vitalicio", name: "Demo Vitalicio" },
};
// misma contraseña para todos los demos:
const DEMO_PASS = "Factor1986?";

/* ===== Contexto y hook ===== */
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  // recuperar sesión almacenada (si existe)
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("fv:user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      getUser: () => user,
      login: (email, pass) => {
        const key = String(email || "").trim().toLowerCase();
        const u = USERS[key];
        if (!u || pass !== DEMO_PASS) return false;
        setUser(u);
        try {
          localStorage.setItem("fv:user", JSON.stringify(u));
        } catch {}
        return true;
      },
      logout: () => {
        setUser(null);
        try {
          localStorage.removeItem("fv:user");
        } catch {}
      },
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
