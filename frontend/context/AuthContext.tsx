"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearStoredToken,
  fetchMe,
  getStoredToken,
  login as loginRequest,
  signup as signupRequest,
  type AuthState,
} from "@/lib/auth";
import { getCapabilities } from "@/lib/roles";

type LoginInput = { email: string; password: string };
type SignupInput = { username: string; email: string; password: string };

type AuthContextValue = {
  auth: AuthState | null;
  initializing: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [initializing, setInitializing] = useState(true);

  const refresh = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setAuth(null);
      return;
    }

    try {
      const state = await fetchMe(token);
      if (!state) {
        clearStoredToken();
        setAuth(null);
        return;
      }
      setAuth(state);
    } catch {
      clearStoredToken();
      setAuth(null);
    }
  }, []);

  const initialize = useCallback(async () => {
    await refresh();
    setInitializing(false);
  }, [refresh]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      initializing,
      login: async ({ email, password }) => {
        const state = await loginRequest(email, password);
        setAuth(state);
      },
      signup: async ({ username, email, password }) => {
        const state = await signupRequest({ username, email, password });
        setAuth(state);
      },
      logout: () => {
        clearStoredToken();
        setAuth(null);
      },
      refresh: async () => refresh(),
    }),
    [auth, initializing, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useCapabilities() {
  const { auth } = useAuth();
  return getCapabilities(auth?.appRole ?? null);
}
