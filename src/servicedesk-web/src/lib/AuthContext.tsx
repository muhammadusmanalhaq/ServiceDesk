"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { setAccessToken } from "./apiClient";
import { components } from "./api-types";

type AuthUser = components["schemas"]["AuthResponse"];

interface AuthContextType {
  user: AuthUser | null;
  login: (data: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt to load from localStorage on init
    const stored = localStorage.getItem("service_desk_user");
    if (stored) {
      const parsed = JSON.parse(stored) as AuthUser;
      setUser(parsed);
      setAccessToken(parsed.accessToken || null);
    }
    setIsLoading(false);
  }, []);

  const login = (data: AuthUser) => {
    setUser(data);
    setAccessToken(data.accessToken || null);
    localStorage.setItem("service_desk_user", JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem("service_desk_user");
  };

  if (isLoading) {
    return null; // Prevent children from rendering (and firing API requests) before token is restored
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
