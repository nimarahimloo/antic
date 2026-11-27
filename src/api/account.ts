import { request } from "./core";

export const accountApi = {
  overview() {
    return request("/account/overview");
  },
  updateProfile(body: Record<string, unknown>) {
    return request("/account/profile", { method: "PATCH", body });
  },
  changePassword(body: Record<string, unknown>) {
    return request("/account/password", { method: "POST", body });
  },
  orders() {
    return request("/account/orders");
  },
  order(id: string) {
    return request(`/account/orders/${id}`);
  },
  addresses() {
    return request("/account/addresses");
  },
  createAddress(body: Record<string, unknown>) {
    return request("/account/addresses", { method: "POST", body });
  },
  updateAddress(id: string, body: Record<string, unknown>) {
    return request(`/account/addresses/${id}`, { method: "PUT", body });
  },
  deleteAddress(id: string) {
    return request(`/account/addresses/${id}`, { method: "DELETE" });
  },
  requests() {
    return request("/account/requests");
  },
};
