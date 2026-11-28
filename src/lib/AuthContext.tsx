"use client";

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from "react";
import { api, AUTH_EVENT, clearToken, isApiError } from "@/api";

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

function isSameOriginUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

interface User {
  id: string;
  email: string | null;
  fullName: string;
  role: string;
  phone?: string;
  createdDate?: string;
}

function normalizeUser(data: unknown): User | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const id = typeof d.id === "string" ? d.id : null;
  const fullName = typeof d.fullName === "string" ? d.fullName : typeof d.full_name === "string" ? d.full_name : typeof d.name === "string" ? d.name : null;
  const role = typeof d.role === "string" ? d.role : null;
  if (!id || !fullName || !role) return null;
  const email = typeof d.email === "string" ? d.email : null;
  const phone = typeof d.phone === "string" ? d.phone : undefined;
  const createdDate = typeof d.createdDate === "string" ? d.createdDate : typeof d.created_date === "string" ? d.created_date : undefined;
  return { id, email, fullName, role, phone, createdDate };
}

function _isValidUser(data: unknown): data is User {
  return normalizeUser(data) !== null;
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

function normalizePublicSettings(data: unknown): PublicSettings | null {
  if (!data || typeof data !== "object") return null;
  const settings = data as PublicSettings;
  const ps = settings.public_settings;
  if (!ps || typeof ps !== "object") return settings;
  // Normalize snake_case aliases to camelCase so consumers use one convention.
  if (ps.logo_url && !ps.logoUrl) ps.logoUrl = ps.logo_url;
  if (ps.hero_slides && !ps.heroSlides) ps.heroSlides = ps.hero_slides;
  if (ps.page_heroes && !ps.pageHeroes) ps.pageHeroes = ps.page_heroes;
  return settings;
}

type AuthError =
  | { type: "network"; message: string }
  | { type: "unauthorized"; message: string }
  | { type: "server"; message: string; status: number }
  | { type: "initialization_failed"; message: string }
  | { type: "login_failed"; message: string }
  | { type: "register_failed"; message: string }
  | null;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: AuthError;
  appPublicSettings: PublicSettings | null;
  authChecked: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  register: (email: string, password: string, fullName: string) => Promise<unknown>;
  logout: (shouldRedirect?: boolean) => Promise<void>;
  navigateToLogin: (returnUrl?: string) => void;
  initializeAuth: () => Promise<void>;
  isLoggingIn: boolean;
  isRegistering: boolean;
  /** When true, a login modal is shown (e.g. after token expiry on admin pages). */
  showLoginModal: boolean;
  /** Opens the login modal (e.g. after a 401/403 on an admin page). */
  openLoginModal: () => void;
  /** Closes the login modal. */
  closeLoginModal: () => void;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState<PublicSettings | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const authRetryRef = React.useRef(0);

  const navigateToLogin = useCallback(
    (returnUrl?: string) => {
      const validated = returnUrl && isSameOriginUrl(returnUrl) ? returnUrl : undefined;
      api.auth.redirectToLogin(validated);
    },
    [],
  );

  const openLoginModal = useCallback(() => {
    setShowLoginModal(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  const initializeAuth = useCallback(async () => {
    consumeAccessTokenFromUrl();

    setIsLoadingAuth(true);
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    try {
      // Public settings first (no auth required)
      try {
        const settings = await api.app.getPublicSettings();
        setAppPublicSettings(normalizePublicSettings(settings));
      } catch {
        setAppPublicSettings({
          id: "antic",
          public_settings: { app_name: "پرده آنتیک", locale: "fa" },
        });
      }

      // Then check user auth
      if (hasStoredToken()) {
        try {
          const currentUser = await api.auth.me();
          const user = normalizeUser(currentUser);
          if (user) {
            setUser(user);
            setIsAuthenticated(true);
          } else {
            // Invalid user data (e.g., missing required fields) — clear token
            clearToken();
            setUser(null);
            setIsAuthenticated(false);
          }
          // Auth check completed successfully (either valid user or invalid token cleared)
          setIsLoadingAuth(false);
          setAuthChecked(true);
        } catch (error) {
          // Only clear token on explicit 401/403; network/5xx errors should not log out
          if (isApiError(error) && error.isAuthError) {
            clearToken();
            setUser(null);
            setIsAuthenticated(false);
            // Auth check completed - token was invalid
            setIsLoadingAuth(false);
            setAuthChecked(true);
          } else {
            // Network/5xx error - don't mark auth as checked, keep loading so we can retry
            // Don't clear token, don't set authChecked, keep isLoadingAuth true
            setAuthError({
              type: "network",
              message: error instanceof Error ? error.message : "Network error during auth check",
            });
            // Trigger a retry after a short delay using ref (doesn't cause re-render)
            setTimeout(() => {
              authRetryRef.current += 1;
              initializeAuthRef.current();
            }, 2000);
            // isLoadingAuth stays true, authChecked stays false - will retry
          }
        }
      } else {
        // No token - auth check complete
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    } catch (error) {
      setAuthError({
        type: "initialization_failed",
        message: error instanceof Error ? error.message : "Failed to initialize auth",
      });
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      setAuthChecked(true);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  }, []);

  const initializeAuthRef = React.useRef(initializeAuth);

  useEffect(() => {
    (async () => {
      initializeAuthRef.current();
    })();
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      // If we're on an admin page, show the login modal instead of immediately
      // clearing auth state and redirecting. This lets the user re-authenticate
      // without losing their place in the admin panel.
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
        setShowLoginModal(true);
      } else {
        clearToken();
        setUser(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        navigateToLogin();
      }
    };
    window.addEventListener(AUTH_EVENT, onUnauthorized);
    return () => {
      window.removeEventListener(AUTH_EVENT, onUnauthorized);
    };
  }, [navigateToLogin]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await api.auth.login(email, password);
      // Backend issues { user, token } — extract the user object so `user.role` is populated.
      const userData = res && typeof res === "object" && "user" in res ? (res as { user: unknown }).user : res;
      const user = normalizeUser(userData);
      if (!user) throw new Error("Invalid user data from server");
      setUser(user);
      setIsAuthenticated(true);
      return res;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setAuthError({ type: "login_failed", message: err.message });
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    setIsRegistering(true);
    setAuthError(null);
    try {
      const res = await api.auth.register(email, password, fullName);
      const userData = res && typeof res === "object" && "user" in res ? (res as { user: unknown }).user : res;
      const user = normalizeUser(userData);
      if (!user) throw new Error("Invalid user data from server");
      setUser(user);
      setIsAuthenticated(true);
      return res;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setAuthError({ type: "register_failed", message: err.message });
      throw error;
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const logout = useCallback(async (shouldRedirect = true) => {
    try {
      // Call server logout first so the server session is invalidated before
      // local state is cleared. If the server call fails we still clear locally.
      await api.auth.logout(shouldRedirect ? window.location.origin + "/" : undefined);
    } finally {
      clearToken();
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  }, []);

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
        initializeAuth,
        isLoggingIn,
        isRegistering,
        showLoginModal,
        openLoginModal,
        closeLoginModal,
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
