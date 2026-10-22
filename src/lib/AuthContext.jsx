import React, { createContext, useState, useContext, useEffect } from "react";
import { base44, clearToken, setToken } from "@/api/base44Client";

const AuthContext = createContext();
const TOKEN_KEY = "antic_access_token";

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
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      try {
        const publicSettings = await base44.app.getPublicSettings();
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
      // Avoid noisy 401 for anonymous visitors
      if (!hasStoredToken()) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      const currentUser = await base44.auth.me();
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
    const res = await base44.auth.login(email, password);
    setUser(res.user);
    setIsAuthenticated(true);
    setAuthError(null);
    return res;
  };

  const register = async (email, password, full_name) => {
    const res = await base44.auth.register(email, password, full_name);
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
      base44.auth.logout(window.location.origin + "/");
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
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
