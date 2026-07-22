import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, setAccessToken, refreshAccessToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' while we try to silently restore a session from the refresh
  // cookie on first load; avoids a flash of the login page for someone
  // who's already signed in.
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    (async () => {
      const restored = await refreshAccessToken();
      if (!restored) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const { user } = await apiFetch("/api/users/me");
        setUser(user);
        setStatus("authenticated");
      } catch {
        setStatus("unauthenticated");
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const data = await apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
