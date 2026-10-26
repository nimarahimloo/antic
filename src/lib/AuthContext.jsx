import React, { createContext, useState, useContext, useEffect } from "react";
import { api, clearToken, setToken } from "@/api/client";

const AuthContext = createContext();
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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    consumeAccessTokenFromUrl();
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      try {
        const publicSettings = await api.app.getPublicSettings();
        setAppPublicSettings(publicSettings);
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
      setAuthError({ type: "unknown", message: error.message || "Failed to load app" });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      if (!hasStoredToken()) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      const currentUser = await api.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch {
      clearToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const login = async (email, password) => {
    const res = await api.auth.login(email, password);
    setUser(res.user);
    setIsAuthenticated(true);
    setAuthError(null);
    return res;
  };

  const register = async (email, password, full_name) => {
    const res = await api.auth.register(email, password, full_name);
    setUser(res.user);
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

  const navigateToLogin = () => {
    api.auth.redirectToLogin(window.location.href);
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
