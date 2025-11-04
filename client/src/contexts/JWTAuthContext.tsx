import React, { createContext, useContext, useEffect, useState } from "react";

type User = { id: number; email: string; full_name?: string } | null;

type Ctx = {
  user: User;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  orgId: string | null;
};

const JWTAuthContext = createContext<Ctx | undefined>(undefined);

export function JWTAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem("jwt_access")
  );
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) localStorage.setItem("jwt_access", accessToken);
    else localStorage.removeItem("jwt_access");
  }, [accessToken]);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      setAccessToken(data.access_token);
      setUser(data.user ?? null);
      setOrgId(data.orgId ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    const res = await fetch("/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setAccessToken(data.access_token);
    }
  }

  async function logout() {
    if (!accessToken) return;
    await fetch("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: "include",
    });
    setAccessToken(null);
    setUser(null);
    setOrgId(null);
  }

  const value: Ctx = {
    user,
    accessToken,
    loading,
    login,
    logout,
    refresh,
    orgId,
  };
  return (
    <JWTAuthContext.Provider value={value}>{children}</JWTAuthContext.Provider>
  );
}

export function useJWTAuth() {
  const ctx = useContext(JWTAuthContext);
  if (!ctx) throw new Error("useJWTAuth must be used within JWTAuthProvider");
  return ctx;
}
