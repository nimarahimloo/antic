import { navigateTo } from "./navigation";
import { API_BASE } from "./constants";
import { clearToken, getToken, setToken } from "./token";
import { request } from "./core";

export const authApi = {
  async me() {
    return request("/auth/me");
  },
  async login(identifier: string, password: string) {
    const body: Record<string, unknown> = { password };
    if (identifier.includes("@")) body.email = identifier;
    else body.phone = identifier;
    body.identifier = identifier;
    const res = await request("/auth/login", {
      method: "POST",
      body,
      auth: false,
    });
    if (res && typeof res === "object" && "token" in res) setToken((res as { token: string }).token);
    return res;
  },
  async loginViaEmailPassword(email: string, password: string) {
    return this.login(email, password);
  },
  loginWithProvider(provider: string, returnTo?: string) {
    if (typeof window === "undefined") return;
    if (provider === "google") {
      const base = API_BASE.replace(/\/$/, "");
      const q = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
      navigateTo(`${base}/auth/google${q}`);
      return;
    }
    navigateTo(`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
  },
  async register(emailOrOpts: string | Record<string, unknown>, password: string, full_name: string) {
    let body: Record<string, unknown>;
    if (typeof emailOrOpts === "object" && emailOrOpts !== null) {
      body = {
        email: emailOrOpts.email || undefined,
        phone: emailOrOpts.phone || undefined,
        password: emailOrOpts.password,
        full_name: emailOrOpts.full_name || emailOrOpts.fullName,
      };
    } else {
      body = { email: emailOrOpts, password, full_name };
    }
    const res = await request("/auth/register", {
      method: "POST",
      body,
      auth: false,
    });
    if (res && typeof res === "object" && "token" in res) setToken((res as { token: string }).token);
    return res;
  },
  async verifyOtp() {
    return { access_token: getToken() };
  },
  async resendOtp() {
    return { ok: true };
  },
  /** Request a password-reset link. The backend never reveals if the email exists. */
  async requestPasswordReset(email: string) {
    return request("/auth/forgot-password", {
      method: "POST",
      body: { email },
      auth: false,
    });
  },
  /** Redeem a single-use reset token and set the new password. */
  async resetPassword(token: string, newPassword: string) {
    return request("/auth/reset-password", {
      method: "POST",
      body: { token, newPassword },
      auth: false,
    });
  },
  setToken,
  logout(redirectUrl?: string) {
    clearToken();
    request("/auth/logout", { method: "POST" }).catch(() => {});
    if (typeof window !== "undefined" && redirectUrl) {
      navigateTo(redirectUrl);
    }
  },
  redirectToLogin(returnUrl?: string) {
    if (typeof window === "undefined") return;
    const q = returnUrl ? `?returnTo=${encodeURIComponent(returnUrl)}` : "";
    navigateTo(`/login${q}`);
  },
};
