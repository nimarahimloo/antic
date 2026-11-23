"use client";

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from "react";
import { api, AUTH_EVENT, clearToken, setToken } from "@/api/client";

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = "antic_access_token";

function consumeAccessTokenFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("access_token");
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
      url.searchParams.delete("access_token");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  } catch {
    /* ignore */
  }
}

function hasStoredToken() {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(TOKEN_KEY);
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  created_date?: string;
}

interface PublicSettings {
  id?: string;
  public_settings?: {
    logo_url?: string;
    logoUrl?: string;
    app_name?: string;
    locale?: string;
    page_heroes?: Record<string, { image?: string; eyebrow?: string; title?: string; description?: string }>;
    pageHeroes?: Record<string, { image?: string; eyebrow?: string; title?: string; description?: string }>;
    hero_slides?: Array<{ space?: string; title?: string; subtitle?: string; image?: string }>;
    heroSlides?: Array<{ space?: string; title?: string; subtitle?: string; image?: string }>;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: { type: string; message: string } | null;
  appPublicSettings: PublicSettings | null;
  authChecked: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  register: (email: string, password: string, full_name: string) => Promise<unknown>;
  logout: (shouldRedirect?: boolean) => void;
  navigateToLogin: () => void;
  checkUserAuth: () => Promise<void>;
  checkAppState: () => Promise<void>;
  setToken: (token: string | null) => void;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState<{ type: string; message: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState<PublicSettings | null>(null);

  const navigateToLogin = useCallback(() => {
    api.auth.redirectToLogin(window.location.href);
  }, []);

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      if (!hasStoredToken()) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      const currentUser = await api.auth.me();
      setUser(currentUser as User);
      setIsAuthenticated(true);
    } catch {
      clearToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      try {
        const publicSettings = await api.app.getPublicSettings();
        setAppPublicSettings((publicSettings || null) as PublicSettings | null);
      } catch (e) {
        console.warn("Public settings unavailable (backend offline?)", e);
        setAppPublicSettings({
          id: "antic",
          public_settings: { app_name: "پرده آنتیک", locale: "fa" },
        });
      }
      setIsLoadingPublicSettings(false);
      await checkUserAuth();
    } catch (error) {
      console.error("App state check failed:", error);
      setAuthError({ type: "unknown", message: error instanceof Error ? error.message : "Failed to load app" });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    consumeAccessTokenFromUrl();
    void checkAppState();

    const onUnauthorized = () => {
      clearToken();
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      navigateToLogin();
    };
    window.addEventListener(AUTH_EVENT, onUnauthorized);
    return () => {
      window.removeEventListener(AUTH_EVENT, onUnauthorized);
    };
  }, [checkAppState, navigateToLogin]);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    // Backend issues { user, token } — extract the user object so `user.role` is populated correctly.
    const userData =
      res && typeof res === "object" && "user" in res ? (res as { user: unknown }).user : res;
    setUser(userData as User);
    setIsAuthenticated(true);
    setAuthError(null);
    return res;
  };

  const register = async (email: string, password: string, full_name: string) => {
    const res = await api.auth.register(email, password, full_name);
    setUser(res as User);
    setIsAuthenticated(true);
    setAuthError(null);
    return res;
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    clearToken();
    if (shouldRedirect) {
      api.auth.logout(window.location.origin + "/");
    } else {
      api.auth.logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        login,
        register,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
