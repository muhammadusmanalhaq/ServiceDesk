"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { setAccessToken } from "./apiClient";
import { components } from "./api-types";
import { API_BASE_URL } from "./apiClient";

type AuthResponse = components["schemas"]["AuthResponse"];

// Only persist non-sensitive profile fields to localStorage.
// The access token is intentionally omitted — it is held only in memory.
type StoredProfile = Pick<AuthResponse, "userId" | "email" | "fullName" | "role" | "departmentId">;

type AuthUser = AuthResponse;

interface AuthContextType {
  user: AuthUser | null;
  login: (data: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const PROFILE_KEY = "service_desk_profile";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount, attempt a silent token refresh using the httpOnly refresh-token
    // cookie. If it succeeds, populate the in-memory access token and user state.
    // If it fails (no valid cookie, expired, etc.), treat the user as logged out.
    async function restoreSession() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (res.ok) {
          const data: AuthResponse = await res.json();
          // Populate in-memory token
          setAccessToken(data.accessToken || null);
          setUser(data);
          // Persist only non-sensitive profile for UI hydration before the next refresh
          const profile: StoredProfile = {
            userId: data.userId,
            email: data.email,
            fullName: data.fullName,
            role: data.role,
            departmentId: data.departmentId,
          };
          localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        } else {
          // Refresh failed — clear any stale profile and redirect to login
          localStorage.removeItem(PROFILE_KEY);
          setUser(null);
          setAccessToken(null);
        }
      } catch {
        // Network error or API down — treat as logged out
        localStorage.removeItem(PROFILE_KEY);
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = (data: AuthUser) => {
    setUser(data);
    setAccessToken(data.accessToken || null);
    // Store only non-sensitive profile fields — never the token
    const profile: StoredProfile = {
      userId: data.userId,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      departmentId: data.departmentId,
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(PROFILE_KEY);
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
